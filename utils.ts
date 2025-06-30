/**
 * Joins path segments, ensuring a single slash between them
 * and removing any trailing slash from the result.
 * Handles leading/trailing slashes on input segments.
 * Example: joinPathSegments("path/to/", "/roms", "game.nes") -> "path/to/roms/game.nes"
 * Example: joinPathSegments("/path/to", "roms/", "/game.nes/") -> "/path/to/roms/game.nes"
 */
export function joinPathSegments(...segments: string[]): string {
  // Filter out empty or nullish segments first to avoid issues with join
  const validSegments = segments.filter(segment => typeof segment === 'string' && segment.trim() !== '');

  if (validSegments.length === 0) {
    return '';
  }

  const pathString = validSegments.join('/');
  // Replace multiple slashes (e.g., //, ///) with a single slash
  const simplifiedPath = pathString.replace(/\/{2,}/g, '/');

  // Remove trailing slash if not the only character (e.g., if path is just "/")
  if (simplifiedPath.length > 1 && simplifiedPath.endsWith('/')) {
    return simplifiedPath.slice(0, -1);
  }

  // Handle case where the original path was intended to be absolute but join might have lost it
  // if the first segment was, e.g., "/" and got filtered or joined.
  // However, with the current join, if segments[0] is "/" or starts with "/", it should be preserved.
  // The main risk is segments like ["", "/foo"], which join('/'); would make "/foo" correctly.
  // If segments = ["/"], join('/') -> "/", replace -> "/", slice -> still "/". Correct.
  // If segments = ["/", "foo"], join -> "/foo", replace -> "/foo". Correct.
  // If segments = ["foo", "/bar"], join -> "foo//bar", replace -> "foo/bar". Correct.

  return simplifiedPath;
}
