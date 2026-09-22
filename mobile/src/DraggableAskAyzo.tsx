import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const STORAGE_KEY =
  "ayzo:mobile:ask-ayzo-floating-position:v1";

const BUTTON_SIZE =
  62;

const EDGE_GUARD =
  12;

const TOP_GUARD =
  72;

const BOTTOM_GUARD =
  112;

type Position = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

function clamp(
  value: number,
  minimum: number,
  maximum: number
) {
  return Math.min(
    Math.max(
      value,
      minimum
    ),
    Math.max(
      minimum,
      maximum
    )
  );
}

function clampPosition(
  position: Position
): Position {
  const maxX =
    window.innerWidth -
    BUTTON_SIZE -
    EDGE_GUARD;

  const maxY =
    window.innerHeight -
    BUTTON_SIZE -
    BOTTOM_GUARD;

  return {
    x:
      clamp(
        position.x,
        EDGE_GUARD,
        maxX
      ),

    y:
      clamp(
        position.y,
        TOP_GUARD,
        maxY
      ),
  };
}

function defaultPosition(): Position {
  return clampPosition({
    x:
      window.innerWidth -
      BUTTON_SIZE -
      18,

    y:
      window.innerHeight -
      BUTTON_SIZE -
      150,
  });
}

function readStoredPosition():
  Position |
  null {
  try {
    const raw =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(
        raw
      ) as Partial<Position>;

    if (
      typeof parsed.x !==
        "number" ||
      typeof parsed.y !==
        "number" ||
      !Number.isFinite(
        parsed.x
      ) ||
      !Number.isFinite(
        parsed.y
      )
    ) {
      return null;
    }

    return clampPosition({
      x:
        parsed.x,

      y:
        parsed.y,
    });
  } catch {
    return null;
  }
}

function savePosition(
  position: Position
) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        position
      )
    );
  } catch {
    // Position persistence is optional.
  }
}

export default function DraggableAskAyzo({
  onOpen,
}: {
  onOpen:
    () => void;
}) {
  const [
    position,
    setPosition,
  ] =
    useState<Position>(
      () =>
        readStoredPosition() ??
        defaultPosition()
    );

  const dragRef =
    useRef<DragState | null>(
      null
    );

  useEffect(
    () => {
      const handleResize =
        () => {
          setPosition(
            current => {
              const next =
                clampPosition(
                  current
                );

              savePosition(
                next
              );

              return next;
            }
          );
        };

      window.addEventListener(
        "resize",
        handleResize
      );

      return () => {
        window.removeEventListener(
          "resize",
          handleResize
        );
      };
    },
    []
  );

  function handlePointerDown(
    event:
      ReactPointerEvent<HTMLButtonElement>
  ) {
    event.preventDefault();

    event.currentTarget
      .setPointerCapture(
        event.pointerId
      );

    dragRef.current = {
      pointerId:
        event.pointerId,

      startX:
        event.clientX,

      startY:
        event.clientY,

      originX:
        position.x,

      originY:
        position.y,

      moved:
        false,
    };
  }

  function handlePointerMove(
    event:
      ReactPointerEvent<HTMLButtonElement>
  ) {
    const drag =
      dragRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    const deltaX =
      event.clientX -
      drag.startX;

    const deltaY =
      event.clientY -
      drag.startY;

    if (
      Math.abs(
        deltaX
      ) > 5 ||
      Math.abs(
        deltaY
      ) > 5
    ) {
      drag.moved =
        true;
    }

    const next =
      clampPosition({
        x:
          drag.originX +
          deltaX,

        y:
          drag.originY +
          deltaY,
      });

    setPosition(
      next
    );
  }

  function finishPointer(
    event:
      ReactPointerEvent<HTMLButtonElement>,
    cancelled = false
  ) {
    const drag =
      dragRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    const deltaX =
      event.clientX -
      drag.startX;

    const deltaY =
      event.clientY -
      drag.startY;

    const next =
      clampPosition({
        x:
          drag.originX +
          deltaX,

        y:
          drag.originY +
          deltaY,
      });

    setPosition(
      next
    );

    savePosition(
      next
    );

    const shouldOpen =
      !cancelled &&
      !drag.moved;

    dragRef.current =
      null;

    try {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId
        );
    } catch {
      // Pointer capture may already be released.
    }

    if (shouldOpen) {
      onOpen();
    }
  }

  return (
    <button
      type="button"
      className="ask-ayzo-floating-button"
      aria-label="Open Ask AYZO"
      style={{
        left:
          `${position.x}px`,
        top:
          `${position.y}px`,
      }}
      onPointerDown={
        handlePointerDown
      }
      onPointerMove={
        handlePointerMove
      }
      onPointerUp={
        event =>
          finishPointer(
            event
          )
      }
      onPointerCancel={
        event =>
          finishPointer(
            event,
            true
          )
      }
      onKeyDown={
        event => {
          if (
            event.key ===
              "Enter" ||
            event.key ===
              " "
          ) {
            event.preventDefault();
            onOpen();
          }
        }
      }
    >
      <span className="ask-ayzo-floating-glow" />

      <img
        src="/ayzo-logo.png"
        alt=""
        draggable={false}
      />

      <span className="ask-ayzo-floating-label">
        ASK
      </span>
    </button>
  );
}
