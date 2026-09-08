import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWelcomeEmailMessage,
  WELCOME_EMAIL_APP_URL,
  WELCOME_EMAIL_SUBJECT,
} from "./welcomeEmailMessage";

test(
  "builds branded AYZO welcome content",
  () => {
    const message =
      buildWelcomeEmailMessage();

    assert.equal(
      message.subject,
      WELCOME_EMAIL_SUBJECT
    );

    assert.match(
      message.text,
      /Your AYZO account is ready\./
    );

    assert.match(
      message.text,
      new RegExp(
        WELCOME_EMAIL_APP_URL
          .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )
      )
    );

    assert.match(
      message.html,
      /Open AYZO/
    );

    assert.match(
      message.html,
      /https:\/\/app\.ayzo\.io/
    );
  }
);
