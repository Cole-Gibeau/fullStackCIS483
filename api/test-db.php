<?php
//Test file to test php -> mysql connection
header('Content-Type: application/json');

try {
    require __DIR__ . '/db.php';

    $count = $pdo->query('SELECT COUNT(*) FROM Packages')->fetchColumn();

    echo json_encode([
        'message' => 'Database connected successfully',
        'packageCount' => (int) $count
    ]);
} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);

    echo json_encode([
        'error' => 'Database connection or query failed'
    ]);
}