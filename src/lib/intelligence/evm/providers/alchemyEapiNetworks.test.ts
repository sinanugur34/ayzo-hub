import assert from "node:assert/strict";
import test from "node:test";

import {
  ALCHEMY_FREE_EAPI_NETWORKS,
  isAlchemyFreeEapiNetwork,
} from "./alchemyEapiNetworks";

test(
  "Alchemy Free EAPI matrix matches live AYZO certification",
  () => {
    assert.deepEqual(
      ALCHEMY_FREE_EAPI_NETWORKS,
      [
        "ethereum",
        "base",
        "bnb",
        "arbitrum",
        "polygon",
        "optimism",
        "avalanche",
        "linea",
        "scroll",
        "monad",
      ]
    );

    assert.equal(
      isAlchemyFreeEapiNetwork(
        "mantle"
      ),
      false
    );

    assert.equal(
      isAlchemyFreeEapiNetwork(
        "sonic"
      ),
      false
    );

    assert.equal(
      isAlchemyFreeEapiNetwork(
        "bnb"
      ),
      true
    );

    assert.equal(
      isAlchemyFreeEapiNetwork(
        "scroll"
      ),
      true
    );

    assert.equal(
      isAlchemyFreeEapiNetwork(
        "monad"
      ),
      true
    );
  }
);
