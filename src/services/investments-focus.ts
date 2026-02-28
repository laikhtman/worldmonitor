interface InvestmentsMapLike {
  setCenter: (lat: number, lon: number, zoom: number) => void;
}

export function focusInvestmentOnMap(
  map: InvestmentsMapLike | null,
  lat: number,
  lon: number
): void {
  map?.setCenter(lat, lon, 6);
}
