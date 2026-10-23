// Rasterize the public/favicon.svg "b4" mark as a macOS app icon.
// macOS does not mask icons, so the plum tile follows Apple's 824pt rounded grid on a 1024 canvas.
import AppKit
import CoreText
let destination = CommandLine.arguments[1]
let size = 1024, tile: CGFloat = 824, inset: CGFloat = 100
let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: size * 4,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
let rect = CGRect(x: inset, y: inset + 10, width: tile, height: tile)
context.setShadow(offset: CGSize(width: 0, height: -10), blur: 24, color: CGColor(gray: 0, alpha: 0.28))
context.addPath(CGPath(roundedRect: rect, cornerWidth: 185, cornerHeight: 185, transform: nil))
context.setFillColor(red: 155.0 / 255, green: 39.0 / 255, blue: 108.0 / 255, alpha: 1)
context.fillPath()
context.setShadow(offset: .zero, blur: 28, color: CGColor(red: 253 / 255, green: 224 / 255, blue: 71 / 255, alpha: 0.55))
let font = CTFontCreateWithName("Arial-Black" as CFString, 336, nil)
let attributes: [NSAttributedString.Key: Any] = [
  NSAttributedString.Key(kCTFontAttributeName as String): font,
  NSAttributedString.Key(kCTForegroundColorAttributeName as String): CGColor(gray: 1, alpha: 1),
  NSAttributedString.Key(kCTKernAttributeName as String): -10,
]
let line = CTLineCreateWithAttributedString(NSAttributedString(string: "b4", attributes: attributes))
var ascent: CGFloat = 0, descent: CGFloat = 0
let width = CTLineGetTypographicBounds(line, &ascent, &descent, nil)
context.textPosition = CGPoint(x: rect.midX - width / 2, y: rect.midY - (ascent + descent) / 2 + descent)
CTLineDraw(line, context)
try NSBitmapImageRep(cgImage: context.makeImage()!).representation(using: .png, properties: [:])!
  .write(to: URL(fileURLWithPath: destination))
