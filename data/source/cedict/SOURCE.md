# CC-CEDICT — source

The pinned CC-CEDICT release used to compile this app's vocabulary data.

- **Origin:** MDBG's CC-CEDICT distribution — https://cc-cedict.org/
- **Download:** https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz
- **License:** CC BY-SA 4.0 — see [`data/LICENSE`](../../LICENSE)
- **Release date:** 2026-08-23 (as stated in the file's own header)
- **File:** `cedict_1_0_ts_utf-8_mdbg.txt`
- **SHA-256:** `4cb212a4ea28dc3bab7d66c7e62302a5e37d5fffacbcd2392297d37446d4a426`

The build reads this committed file directly — it is never fetched over the
network at build time, so the build works offline from a clean checkout.
