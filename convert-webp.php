<?php
/**
 * Convert PNG/JPG images to WebP using PHP GD.
 * Run via: php convert-webp.php
 *
 * Processes uploads directory, creates .webp versions alongside originals.
 */

$upload_dir = __DIR__ . '/wp-content/uploads';

$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($upload_dir, RecursiveDirectoryIterator::SKIP_DOTS)
);

$converted = 0;
$skipped = 0;
$errors = 0;

foreach ($files as $file) {
    $path = $file->getPathname();
    $ext = strtolower($file->getExtension());

    if (!in_array($ext, ['png', 'jpg', 'jpeg'], true)) {
        continue;
    }

    // Skip tiny files and SVGs misnamed
    if ($file->getSize() < 10240) {
        continue;
    }

    $webp_path = preg_replace('/\.(png|jpe?g)$/i', '.webp', $path);

    // Skip if WebP already exists and is newer
    if (file_exists($webp_path) && filemtime($webp_path) >= filemtime($path)) {
        $skipped++;
        continue;
    }

    if ($ext === 'png') {
        $img = @imagecreatefrompng($path);
        if ($img && imageistruecolor($img)) {
            // Preserve alpha
            imagepalettetotruecolor($img);
            imagealphablending($img, true);
            imagesavealpha($img, true);
        }
    } else {
        $img = @imagecreatefromjpeg($path);
    }

    if (!$img) {
        echo "ERROR: Could not read $path\n";
        $errors++;
        continue;
    }

    $quality = ($ext === 'png') ? 80 : 82;
    if (imagewebp($img, $webp_path, $quality)) {
        $orig_size = filesize($path);
        $webp_size = filesize($webp_path);
        $saving = round((1 - $webp_size / $orig_size) * 100);
        echo "OK: " . basename($path) . " ({$saving}% smaller)\n";
        $converted++;
    } else {
        echo "ERROR: Failed to write $webp_path\n";
        $errors++;
    }

    imagedestroy($img);
}

echo "\nDone: $converted converted, $skipped skipped, $errors errors\n";
