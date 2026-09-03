import assert from "node:assert/strict";
import test from "node:test";

import {
  findFirstContractCodeBlock,
  hasEvmRuntimeCode,
  parseEvmHexQuantity,
  toEvmBlockTag,
} from "./contractDeployment";

test(
  "finds first observed contract-code block deterministically",
  async () => {
    const deploymentBlock =
      12_345;

    const result =
      await findFirstContractCodeBlock(
        20_000,
        async block =>
          block >=
          deploymentBlock
      );

    assert.equal(
      result,
      deploymentBlock
    );
  }
);

test(
  "returns null when contract code is absent",
  async () => {
    const result =
      await findFirstContractCodeBlock(
        100,
        async () => false
      );

    assert.equal(
      result,
      null
    );
  }
);

test(
  "normalizes rpc quantities and runtime code",
  () => {
    assert.equal(
      parseEvmHexQuantity(
        "0x10"
      ),
      16
    );

    assert.equal(
      toEvmBlockTag(16),
      "0x10"
    );

    assert.equal(
      hasEvmRuntimeCode(
        "0x60016000"
      ),
      true
    );

    assert.equal(
      hasEvmRuntimeCode("0x"),
      false
    );

    assert.equal(
      hasEvmRuntimeCode("0x0"),
      false
    );
  }
);
