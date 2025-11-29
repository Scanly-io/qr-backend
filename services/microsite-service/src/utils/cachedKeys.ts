// Generates a stable Redis cache key for a published microsite by QR id.
// Keeping function tiny & pure so it can be reused both in publish & render paths.
export function micrositeCacheKey(qrId: string): string {
	return `microsite:${qrId}`;
}