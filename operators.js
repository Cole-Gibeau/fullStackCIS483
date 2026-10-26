const STORAGE_KEY = "campusEcoPackages";
const TRACKING_PATTERN = /^PKG[0-9]{4}$/;
const MAX_WEIGHT = 150;

class Package {
    constructor({ trackingNumber, priority, building, locker, weight, length, width, height, 
        status = "AVAILABLE", createdAt = new Date().toISOString() }) 
        {
            this.trackingNumber = trackingNumber;
            this.priority = priority;
            this.building = building;
            this.locker = locker;
            this.weight = weight;
            this.length = length;
            this.width = width;
            this.height = height;
            this.status = status;
            this.createdAt = createdAt;
        }
    }