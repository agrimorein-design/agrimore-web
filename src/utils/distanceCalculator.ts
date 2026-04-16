export function calculateDistance(parseFloat1: number, parseFloat2: number, parseFloat3: number, parseFloat4: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (parseFloat3 - parseFloat1) * Math.PI / 180;
  const dLon = (parseFloat4 - parseFloat2) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(parseFloat1 * Math.PI / 180) * Math.cos(parseFloat3 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

export function getDistanceCategory(distanceInKm: number): string {
  if (distanceInKm <= 0.1) return '0-100m';
  if (distanceInKm <= 0.5) return '100m-500m';
  if (distanceInKm <= 1.0) return '500m-1km';
  if (distanceInKm <= 2.0) return '1km-2km';
  return '>2km';
}

export function getDistanceColor(category: string): string {
  switch (category) {
    case '0-100m': return '#0F9D58'; // Green
    case '100m-500m': return '#4285F4'; // Blue
    case '500m-1km': return '#F4B400'; // Orange
    case '1km-2km': return '#DB4437'; // Red
    default: return '#757575'; // Gray
  }
}
