"""Minimal stdlib reader for ESRI Polygon shapefiles + DBF (no third-party deps)."""
import math
import struct


def read_dbf(path):
    with open(path, 'rb') as f:
        head = f.read(32)
        nrec = struct.unpack('<I', head[4:8])[0]
        hlen, rlen = struct.unpack('<HH', head[8:12])
        fields = []
        while True:
            d = f.read(32)
            if d[0:1] == b'\r' or len(d) < 32:
                break
            name = d[:11].split(b'\x00')[0].decode('ascii', 'replace')
            fields.append((name, chr(d[11]), d[16], d[17]))
        f.seek(hlen)
        rows = []
        for _ in range(nrec):
            rec = f.read(rlen)
            if not rec:
                break
            deleted = rec[0:1] == b'*'
            pos, row = 1, {}
            for name, ftype, flen, _dec in fields:
                raw = rec[pos:pos + flen].decode('latin-1').strip()
                pos += flen
                if ftype in 'NF':
                    try:
                        row[name] = float(raw) if raw else None
                    except ValueError:
                        row[name] = None
                else:
                    row[name] = raw
            row['_deleted'] = deleted
            rows.append(row)
        return fields, rows


def read_shp(path):
    """Return list of dicts: {type, bbox, parts:[ring,...]} for each record (ring = list of (x,y))."""
    out = []
    with open(path, 'rb') as f:
        hdr = f.read(100)
        shape_type_file = struct.unpack('<i', hdr[32:36])[0]
        while True:
            rh = f.read(8)
            if len(rh) < 8:
                break
            _num, clen = struct.unpack('>ii', rh)
            content = f.read(clen * 2)
            st = struct.unpack('<i', content[:4])[0]
            if st == 0:
                out.append({'type': 0, 'bbox': None, 'parts': []})
                continue
            if st not in (5, 15, 25):
                raise ValueError('unsupported shape type %d' % st)
            bbox = struct.unpack('<4d', content[4:36])
            nparts, npts = struct.unpack('<2i', content[36:44])
            parts = list(struct.unpack('<%di' % nparts, content[44:44 + 4 * nparts]))
            ptoff = 44 + 4 * nparts
            pts = struct.unpack('<%dd' % (2 * npts), content[ptoff:ptoff + 16 * npts])
            xy = [(pts[2 * i], pts[2 * i + 1]) for i in range(npts)]
            parts.append(npts)
            rings = [xy[parts[i]:parts[i + 1]] for i in range(nparts)]
            out.append({'type': st, 'bbox': bbox, 'parts': rings})
    return shape_type_file, out


def ring_area_centroid(ring):
    a = cx = cy = 0.0
    for i in range(len(ring) - 1):
        x0, y0 = ring[i]
        x1, y1 = ring[i + 1]
        c = x0 * y1 - x1 * y0
        a += c
        cx += (x0 + x1) * c
        cy += (y0 + y1) * c
    a *= 0.5
    if a == 0:
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        return 0.0, sum(xs) / len(xs), sum(ys) / len(ys)
    return a, cx / (6 * a), cy / (6 * a)


def haversine_km(lon1, lat1, lon2, lat2):
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def point_in_ring(x, y, ring):
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside
