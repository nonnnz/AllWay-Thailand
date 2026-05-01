/**
 * Grid Strategy for Bangkok Bounding Box
 * Area: Bangkok bounding box (13.48, 100.28 to 13.96, 100.95)
 * Method: 500m x 500m grid search (~0.0045 degrees lat/long)
 */

export interface GridPoint {
  lat: number;
  lng: number;
}

export function generateGrid(
  minLat = 13.48,
  maxLat = 13.96,
  minLng = 100.28,
  maxLng = 100.95,
  stepSizeKm = 0.5 // 500m
): GridPoint[] {
  // Rough conversion: 1 degree lat is ~111km, 1 degree lng is ~111km * cos(lat)
  // At Bangkok's lat (~13.7), cos(13.7) is ~0.97
  const latStep = stepSizeKm / 111;
  const lngStep = stepSizeKm / (111 * Math.cos((minLat + maxLat) / 2 * (Math.PI / 180)));

  const points: GridPoint[] = [];

  for (let lat = minLat; lat <= maxLat; lat += latStep) {
    for (let lng = minLng; lng <= maxLng; lng += lngStep) {
      points.push({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
    }
  }

  return points;
}
