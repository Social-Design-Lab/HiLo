import Foundation
import ImageIO
import UniformTypeIdentifiers

if CommandLine.arguments.count != 3 {
    fputs("Usage: convert-heic-to-jpeg <input> <output>\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fputs("Could not read image: \(inputURL.path)\n", stderr)
    exit(1)
}

guard let destination = CGImageDestinationCreateWithURL(
    outputURL as CFURL,
    UTType.jpeg.identifier as CFString,
    1,
    nil
) else {
    fputs("Could not create destination: \(outputURL.path)\n", stderr)
    exit(1)
}

let options = [
    kCGImageDestinationLossyCompressionQuality: 0.9
] as CFDictionary

CGImageDestinationAddImage(destination, image, options)

if !CGImageDestinationFinalize(destination) {
    fputs("Could not write JPEG: \(outputURL.path)\n", stderr)
    exit(1)
}
