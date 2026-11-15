using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using System.ComponentModel.DataAnnotations;

namespace CampusEco.Api.Controllers;

[ApiController]
[Route("api/packages")]
public class PackagesController : ControllerBase
{
    private readonly string _connectionString;

    public PackagesController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("CampusEco")
            ?? throw new InvalidOperationException("Missing CampusEco connection string.");
    }

    [HttpGet]
    public async Task<ActionResult<List<PackageSummary>>> GetPackages(
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT p.tracking_number, b.building_name, l.locker_number,
                   p.priority, p.status
            FROM Packages p
            JOIN Lockers l ON l.locker_id = p.locker_id
            JOIN Buildings b ON b.building_id = l.building_id
            ORDER BY p.tracking_number
            """;

        var packages = new List<PackageSummary>();

        await using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            packages.Add(new PackageSummary(
                reader.GetString(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetString(4)));
        }

        return Ok(packages);
    }


    [HttpPost("{trackingNumber}/claim")]
    public async Task<IActionResult> ClaimPackage(
        string trackingNumber,
        [FromServices] IWebHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
            return NotFound();

        // These IDs come from database/mockData.sql.
        const int demoDriverId = 2;
        const int demoVehicleId = 1;

        const string claimSql = """
        UPDATE Packages
        SET status = 'CLAIMED',
            driver_user_id = @driverId,
            vehicle_id = @vehicleId
        WHERE tracking_number = @trackingNumber
          AND status = 'AVAILABLE'
          AND driver_user_id IS NULL;
        """;

        const string eventSql = """
        INSERT INTO TransitEvents (package_id, changed_by_user_id, status)
        SELECT package_id, @driverId, 'CLAIMED'
        FROM Packages
        WHERE tracking_number = @trackingNumber;
        """;

        await using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await using var claimCommand = new MySqlCommand(claimSql, connection, transaction);
        claimCommand.Parameters.AddWithValue("@trackingNumber", trackingNumber);
        claimCommand.Parameters.AddWithValue("@driverId", demoDriverId);
        claimCommand.Parameters.AddWithValue("@vehicleId", demoVehicleId);

        if (await claimCommand.ExecuteNonQueryAsync(cancellationToken) == 0)
            return Conflict(new { message = "This package is no longer available to claim." });

        await using var eventCommand = new MySqlCommand(eventSql, connection, transaction);
        eventCommand.Parameters.AddWithValue("@trackingNumber", trackingNumber);
        eventCommand.Parameters.AddWithValue("@driverId", demoDriverId);
        await eventCommand.ExecuteNonQueryAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        return Ok(new { trackingNumber, status = "CLAIMED" });
    }

    [HttpPatch("{trackingNumber}/status")]
    public async Task<IActionResult> UpdatePackageStatus(
    string trackingNumber,
    [FromBody] UpdatePackageStatusRequest request,
    [FromServices] IWebHostEnvironment environment,
    CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
            return NotFound();

        const int demoDriverId = 2;

        var previousStatus = request.Status switch
        {
            "LOADED" => "CLAIMED",
            "EN_ROUTE" => "LOADED",
            "DELIVERED" => "EN_ROUTE",
            _ => null
        };

        if (previousStatus is null)
            return BadRequest(new { message = "Use LOADED, EN_ROUTE, or DELIVERED." });

        const string updateSql = """
        UPDATE Packages
        SET status = @status
        WHERE tracking_number = @trackingNumber
          AND driver_user_id = @driverId
          AND status = @previousStatus;
        """;

        const string eventSql = """
        INSERT INTO TransitEvents (package_id, changed_by_user_id, status)
        SELECT package_id, @driverId, status
        FROM Packages
        WHERE tracking_number = @trackingNumber;
        """;

        await using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await using var updateCommand = new MySqlCommand(updateSql, connection, transaction);
        updateCommand.Parameters.AddWithValue("@status", request.Status!);
        updateCommand.Parameters.AddWithValue("@trackingNumber", trackingNumber);
        updateCommand.Parameters.AddWithValue("@driverId", demoDriverId);
        updateCommand.Parameters.AddWithValue("@previousStatus", previousStatus);

        if (await updateCommand.ExecuteNonQueryAsync(cancellationToken) == 0)
            return Conflict(new { message = "The package is not assigned to this driver or is not at the required status." });

        await using var eventCommand = new MySqlCommand(eventSql, connection, transaction);
        eventCommand.Parameters.AddWithValue("@trackingNumber", trackingNumber);
        eventCommand.Parameters.AddWithValue("@driverId", demoDriverId);
        await eventCommand.ExecuteNonQueryAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        return Ok(new { trackingNumber, status = request.Status });
    }

    [HttpGet("{trackingNumber}")]
    public async Task<IActionResult> TrackPackage(
    string trackingNumber,
    CancellationToken cancellationToken)
    {
        const string sql = """
        SELECT p.tracking_number, b.building_name, l.locker_number,
               p.priority, p.status, e.status, e.event_time
        FROM Packages p
        JOIN Lockers l ON l.locker_id = p.locker_id
        JOIN Buildings b ON b.building_id = l.building_id
        LEFT JOIN TransitEvents e ON e.package_id = p.package_id
        WHERE p.tracking_number = @trackingNumber
        ORDER BY e.event_time, e.event_id;
        """;

        await using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@trackingNumber", trackingNumber);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
            return NotFound(new { message = "No package found for that tracking number." });

        var package = new PackageSummary(
            reader.GetString(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.GetString(4));

        var history = new List<TransitEventSummary>();

        do
        {
            if (!reader.IsDBNull(5))
            {
                history.Add(new TransitEventSummary(
                    reader.GetString(5),
                    reader.GetDateTime(6)));
            }
        }
        while (await reader.ReadAsync(cancellationToken));

        return Ok(new
        {
            package.TrackingNumber,
            package.DestinationBuilding,
            package.DestinationLocker,
            package.Priority,
            package.Status,
            History = history
        });
    }


    [HttpPost("{trackingNumber}/confirmation")]
    public async Task<IActionResult> ConfirmReceipt(
    string trackingNumber,
    [FromBody] ConfirmReceiptRequest request,
    [FromServices] IWebHostEnvironment environment,
    CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
            return NotFound();

        var signedName = request.SignedName?.Trim();

        if (string.IsNullOrEmpty(signedName) || signedName.Length > 100)
            return BadRequest(new { message = "Enter a name between 1 and 100 characters." });

        const int demoRecipientId = 1;

        const string sql = """
        INSERT INTO DeliveryConfirmations (package_id, user_id, signed_name)
        SELECT package_id, recipient_user_id, @signedName
        FROM Packages
        WHERE tracking_number = @trackingNumber
          AND recipient_user_id = @recipientId
          AND status = 'DELIVERED';
        """;

        await using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@trackingNumber", trackingNumber);
        command.Parameters.AddWithValue("@recipientId", demoRecipientId);
        command.Parameters.AddWithValue("@signedName", signedName);

        try
        {
            if (await command.ExecuteNonQueryAsync(cancellationToken) == 0)
                return Conflict(new { message = "Only a delivered package assigned to you can be confirmed." });
        }
        catch (MySqlException ex) when (ex.Number == 1062) // Duplicate package confirmation
        {
            return Conflict(new { message = "Receipt was already confirmed for this package." });
        }

        return Ok(new { trackingNumber, signedName, received = true });
    }


    [HttpPost]
    public async Task<IActionResult> CreatePackage(
    [FromBody] CreatePackageRequest request,
    [FromServices] IWebHostEnvironment environment,
    CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
            return NotFound();

        const int demoOperatorId = 3;

        const string packageSql = """
        INSERT INTO Packages (
            tracking_number, recipient_user_id, locker_id, priority,
            weight_lbs, length_in, width_in, height_in, status
        )
        SELECT @trackingNumber, u.user_id, l.locker_id, @priority,
               @weightLbs, @lengthIn, @widthIn, @heightIn, 'AVAILABLE'
        FROM Users u
        JOIN Lockers l ON l.locker_id = @lockerId
        WHERE u.user_id = @recipientId AND u.role = 'END_USER';
        """;

        const string eventSql = """
        INSERT INTO TransitEvents (package_id, changed_by_user_id, status)
        VALUES (@packageId, @operatorId, 'AVAILABLE');
        """;

        await using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await using var packageCommand = new MySqlCommand(packageSql, connection, transaction);
        packageCommand.Parameters.AddWithValue("@trackingNumber", request.TrackingNumber);
        packageCommand.Parameters.AddWithValue("@recipientId", request.RecipientUserId);
        packageCommand.Parameters.AddWithValue("@lockerId", request.LockerId);
        packageCommand.Parameters.AddWithValue("@priority", request.Priority);
        packageCommand.Parameters.AddWithValue("@weightLbs", request.WeightLbs);
        packageCommand.Parameters.AddWithValue("@lengthIn", request.LengthIn);
        packageCommand.Parameters.AddWithValue("@widthIn", request.WidthIn);
        packageCommand.Parameters.AddWithValue("@heightIn", request.HeightIn);

        try
        {
            if (await packageCommand.ExecuteNonQueryAsync(cancellationToken) == 0)
                return BadRequest(new { message = "Choose a valid recipient and locker." });
        }
        catch (MySqlException ex) when (ex.Number == 1062) // Duplicate tracking number
        {
            return Conflict(new { message = "That tracking number already exists." });
        }

        await using var eventCommand = new MySqlCommand(eventSql, connection, transaction);
        eventCommand.Parameters.AddWithValue("@packageId", packageCommand.LastInsertedId);
        eventCommand.Parameters.AddWithValue("@operatorId", demoOperatorId);
        await eventCommand.ExecuteNonQueryAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        return CreatedAtAction(
            nameof(TrackPackage),
            new { trackingNumber = request.TrackingNumber },
            new { request.TrackingNumber, status = "AVAILABLE" });
    }

    [HttpGet("/api/lockers")]
    public async Task<IActionResult> GetLockers(CancellationToken cancellationToken)
    {
        const string sql = """
        SELECT l.locker_id, b.building_name, l.locker_number
        FROM Lockers l
        JOIN Buildings b ON b.building_id = l.building_id
        ORDER BY b.building_name, l.locker_number;
        """;

        var lockers = new List<LockerOption>();

        await using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            lockers.Add(new LockerOption(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.GetString(2)));
        }

        return Ok(lockers);
    }

    [HttpGet("/api/recipients")]
    public async Task<IActionResult> GetRecipients(
    [FromServices] IWebHostEnvironment environment,
    CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
            return NotFound();

        const string sql = """
        SELECT user_id, full_name
        FROM Users
        WHERE role = 'END_USER'
        ORDER BY full_name, user_id;
        """;

        var recipients = new List<RecipientOption>();

        await using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = new MySqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            recipients.Add(new RecipientOption(
                reader.GetInt32(0),
                reader.GetString(1)));
        }

        return Ok(recipients);
    }
}

//Records

public record PackageSummary(
    string TrackingNumber,
    string DestinationBuilding,
    string DestinationLocker,
    string Priority,
    string Status);
public record UpdatePackageStatusRequest(string? Status);
public record ConfirmReceiptRequest(string? SignedName);
public record TransitEventSummary(string Status, DateTime EventTime);

public record CreatePackageRequest(
    [property: Required, RegularExpression(@"^PKG[0-9]{4}$")] string TrackingNumber,
    [property: Range(1, int.MaxValue)] int RecipientUserId,
    [property: Range(1, int.MaxValue)] int LockerId,
    [property: Required, RegularExpression("^(low|medium|high|urgent)$")] string Priority,
    [property: Range(typeof(decimal), "0.01", "150")] decimal WeightLbs,
    [property: Range(typeof(decimal), "0.01", "9999.99")] decimal LengthIn,
    [property: Range(typeof(decimal), "0.01", "9999.99")] decimal WidthIn,
    [property: Range(typeof(decimal), "0.01", "9999.99")] decimal HeightIn);

public record LockerOption(int LockerId, string BuildingName, string LockerNumber);

public record RecipientOption(int RecipientUserId, string FullName);