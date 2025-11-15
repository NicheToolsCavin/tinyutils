import sys
from pathlib import Path

# Allow importing tinyutils package code
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from api.convert.convert_service import convert_one, ConversionOptions  # type: ignore


def main():
    if len(sys.argv) < 3:
        print("Usage: python scripts/local_convert_docx_to_md.py <input.docx> <output.md>")
        sys.exit(1)
    in_path = Path(sys.argv[1]).expanduser().resolve()
    out_path = Path(sys.argv[2]).expanduser().resolve()

    data = in_path.read_bytes()
    res = convert_one(
        input_bytes=data,
        name=in_path.name,
        targets=["md"],
        from_format="docx",
        options=ConversionOptions(extract_media=True, remove_zero_width=True),
    )
    if res.error:
        raise SystemExit(f"Conversion error: {res.error.kind}: {res.error.message}")

    md = None
    for art in res.outputs:
        if art.target == "md":
            md = art.data
            break
    if md is None:
        raise SystemExit("No markdown output produced")

    out_path.write_bytes(md)
    if res.media:
        media_zip = out_path.parent / f"{out_path.stem}-media.zip"
        media_zip.write_bytes(res.media.data)
        print(f"Media bundle: {media_zip}")
    print(f"Wrote: {out_path}")


if __name__ == "__main__":
    main()

