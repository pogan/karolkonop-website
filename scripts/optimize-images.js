// Re-encodes the source photography into the web assets the page actually
// serves. Run with `npm run build:img` after adding or replacing a photo.
//
// Sources live in assets/ (not served). Output goes to public/img and the
// public/ icon set. Widths below match how each image is rendered — the
// originals were 1545px wide and up to 400KB each, shipped at full size.

const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico').default ?? require('png-to-ico');

const SRC = path.join(__dirname, '..', 'assets');
const IMG_OUT = path.join(__dirname, '..', 'public', 'img');
const PUB = path.join(__dirname, '..', 'public');

// Full source resolution (the JPEGs in assets/ are 1545px wide; sharp will not
// upscale, so asking for more is a no-op). Quality 85 is visually
// indistinguishable from 100 on these photos but roughly a quarter of the bytes
// — at 100, WebP faithfully encodes the source JPEG's own compression noise.
const PHOTOS = [
	{ src: 'karolkonop_photo_1.JPG', out: 'karolkonop_photo_1.webp', width: 1545, quality: 85 },
	{ src: 'karolkonop_photo_7_b.JPG', out: 'karolkonop_photo_7_b.webp', width: 1545, quality: 85 },
	{ src: 'karolkonop_photo_5.JPG', out: 'karolkonop_photo_5.webp', width: 1545, quality: 85 },
	{ src: 'karolkonop_photo_11.JPG', out: 'karolkonop_photo_11.webp', width: 1545, quality: 85 },
	{ src: 'karolkonop_photo_13.JPG', out: 'karolkonop_photo_13.webp', width: 1545, quality: 85 },
	{ src: 'karolkonop_portret.jpg', out: 'karolkonop_portret.webp', width: 640, quality: 85 },
];

async function main() {
	await fs.mkdir(IMG_OUT, { recursive: true });

	for (const { src, out, width, quality } of PHOTOS) {
		await sharp(path.join(SRC, src))
			.resize({ width, withoutEnlargement: true })
			.webp({ quality })
			.toFile(path.join(IMG_OUT, out));
		console.log(`img/${out}`);
	}

	// Open Graph card. og:image:type already declared image/jpeg, so ship JPEG.
	await sharp(path.join(SRC, 'meta.png'))
		.resize({ width: 1200, height: 630, fit: 'cover' })
		.jpeg({ quality: 82, mozjpeg: true })
		.toFile(path.join(PUB, 'meta.jpg'));
	console.log('meta.jpg');

	// Icon set, all derived from icon.svg.
	const svg = path.join(PUB, 'icon.svg');
	const sizes = [
		[16, 'favicon-16x16.png'],
		[32, 'favicon-32x32.png'],
		[180, 'apple-touch-icon.png'],
		[192, 'icon.png'],
		[512, 'icon-512.png'],
	];
	for (const [size, name] of sizes) {
		await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(PUB, name));
		console.log(name);
	}

	// favicon.ico was 364KB. Rebuild it from the 16/32/48 rasters.
	const icoBuffers = await Promise.all(
		[16, 32, 48].map((size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer())
	);
	await fs.writeFile(path.join(PUB, 'favicon.ico'), await pngToIco(icoBuffers));
	console.log('favicon.ico');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
