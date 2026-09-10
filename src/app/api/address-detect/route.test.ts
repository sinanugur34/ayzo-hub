import assert from "node:assert/strict";
import test from "node:test";

import {
  POST,
} from "./route";

async function detect(
  address: string
) {
  const response =
    await POST(
      new Request(
        "http://localhost/api/address-detect",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              address,
            }),
        }
      )
    );

  return {
    status:
      response.status,
    body:
      await response.json(),
  };
}

test(
  "detects Dogecoin before generic Base58 families",
  async () => {
    const result =
      await detect(
        "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L"
      );

    assert.equal(
      result.status,
      200
    );

    assert.equal(
      result.body.network,
      "dogecoin"
    );
  }
);

test(
  "detects TRON before generic Base58 families",
  async () => {
    const result =
      await detect(
        "TJRabPrwbZy45sbavfcjinPJC18kjpRTv8"
      );

    assert.equal(
      result.status,
      200
    );

    assert.equal(
      result.body.network,
      "tron"
    );
  }
);

test(
  "does not classify an invalid TRON checksum as TRON",
  async () => {
    const result =
      await detect(
        "TJRabPrwbZy45sbavfcjinPJC18kjpRTv9"
      );

    assert.notEqual(
      result.body.network,
      "tron"
    );
  }
);

test(
  "detects Bitcoin mainnet",
  async () => {
    const result =
      await detect(
        "1BoatSLRHtKNngkdXEeobR76b53LETtpyT"
      );

    assert.equal(
      result.body.network,
      "bitcoin"
    );
  }
);

test(
  "detects EVM without inventing an EVM chain",
  async () => {
    const result =
      await detect(
        "0x0000000000000000000000000000000000000001"
      );

    assert.equal(
      result.body.network,
      "evm"
    );
  }
);

test(
  "detects Solana address",
  async () => {
    const result =
      await detect(
        "11111111111111111111111111111111"
      );

    assert.equal(
      result.body.network,
      "solana"
    );
  }
);

test(
  "returns null for unknown input",
  async () => {
    const result =
      await detect(
        "not-a-chain-address"
      );

    assert.equal(
      result.body.network,
      null
    );
  }
);
