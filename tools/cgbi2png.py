#!/usr/bin/env python3
"""CgBI (Apple PNG) -> 标准 PNG 解码器（Linux 本地构建/验证用）。

实证（2026-08-19，官方 itis.app AppIcon60x60@2x.png, 120x120 RGBA）：
  1. CgBI PNG 多一个 CgBI chunk（IHDR 之后），IDAT 是剥掉 zlib 头/尾的 raw deflate；
     解压即带 filter 字节的 scanlines（zlib.decompress(idat, -15) 直解成功）。
  2. 像素通道序是 BGRA（苹果私有），直接把蓝显示成橙 —— 必须交换为 RGBA，
     否则生成的图标颜色错乱（"橙色假象"）。premultiplied alpha 由 icon 素材
     alpha=0 处 RGB 为 0 自然成立，无需解开。
CI 构建（macOS sips）原生支持 CgBI，无需此脚本；本脚本供 Linux/快速验证复用。
用法: python3 tools/cgbi2png.py <in.cgbi.png> <out.png>
"""
import struct, sys, zlib


def chunks(buf):
    i, n = 8, len(buf)
    while i < n:
        ln, typ = struct.unpack('>I4s', buf[i:i + 8])
        yield typ, buf[i + 8:i + 8 + ln]
        i += 12 + ln


def main(src, dst):
    data = open(src, 'rb').read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a png'
    ihdr = idat = None
    for typ, payload in chunks(data):
        if typ == b'IHDR':
            ihdr = payload
        elif typ == b'CgBI':
            continue
        elif typ == b'IDAT':
            idat = (idat or b'') + payload
    assert ihdr and idat, 'missing IHDR/IDAT'
    w, h, bd, ct = struct.unpack('>IIBB', ihdr[:10])
    assert bd == 8 and ct == 6, f'unsupported ({bd}-bit color-type {ct})'
    rows = zlib.decompress(idat, -15)  # raw deflate（无 zlib 头尾）
    stride = w * 4
    pix = bytearray()
    for y in range(h):  # 每行首字节=filter，像素 BGRA -> RGBA
        row = rows[y * (stride + 1) + 1:(y + 1) * (stride + 1)]
        pix += b'\x00'
        for x in range(w):
            b, g, r, a = row[x * 4:x * 4 + 4]
            pix += bytes((r, g, b, a))
    out = b'\x89PNG\r\n\x1a\n'
    out += struct.pack('>I4s', 13, b'IHDR') + ihdr + struct.pack('>I', zlib.crc32(b'IHDR' + ihdr))
    comp = zlib.compress(bytes(pix))
    out += struct.pack('>I4s', len(comp), b'IDAT') + comp + struct.pack('>I', zlib.crc32(b'IDAT' + comp))
    out += struct.pack('>I4s', 0, b'IEND') + struct.pack('>I', zlib.crc32(b'IEND'))
    open(dst, 'wb').write(out)
    print(f'OK: {src} -> {dst} ({w}x{h})')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])