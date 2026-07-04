#!/usr/bin/env python3
"""Print a backend test class skeleton matching this repo's pytest conventions.

Usage: gen-test.py <FeatureName> <METHOD> <path>
Example: gen-test.py Checkout POST /api/checkout/quote
"""
import sys


def main():
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)

    feature, method, path = sys.argv[1], sys.argv[2].upper(), sys.argv[3]
    method_call = {
        "GET": "api.get",
        "POST": "api.post",
        "PUT": "api.put",
        "DELETE": "api.delete",
    }.get(method)
    if not method_call:
        print(f"Unsupported method: {method}")
        sys.exit(1)

    extra_kwarg = ", json=payload" if method in ("POST", "PUT") else ""
    payload_line = "        payload = {}\n" if method in ("POST", "PUT") else ""

    print(f'''class Test{feature}:
    def test_{feature.lower()}_happy_path(self, api):
{payload_line}        r = {method_call}(f"{{BASE_URL}}{path}"{extra_kwarg}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        # TODO: assert real response shape from backend/server.py

    def test_{feature.lower()}_invalid_input(self, api):
        # TODO: hit with invalid input, assert 4xx
        pass
''')


if __name__ == "__main__":
    main()
