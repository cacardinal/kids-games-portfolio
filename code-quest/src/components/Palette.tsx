import type { Mission, Op } from "../game/interpreter";
import { OpGlyph, OP_LABEL } from "./chipGlyph";
import { useStore } from "../state/store";
import { sfx } from "../lib/sfx";

interface PaletteProps {
  mission: Mission;
  disabled: boolean; // during run
}

// Palette shows only the sector's allowedOps. While a REPEAT chip (or a body chip inside it) is
// latched, simple-op taps append INTO that loop body. REPEAT is hidden while latched (depth-1 rule).
// A "DONE" button releases the latch back to top-level append.
export function Palette({ mission, disabled }: PaletteProps) {
  const appendOp = useStore((s) => s.appendOp);
  const appendRepeat = useStore((s) => s.appendRepeat);
  const loopLatch = useStore((s) => s.loopLatch);
  const releaseLoopLatch = useStore((s) => s.releaseLoopLatch);

  // FIX 1: loop-targeting is driven by the latch, not transient selection.
  const loopTargeting = loopLatch !== null;

  const onTap = (op: Op) => {
    if (disabled) return;
    if (op === "REPEAT") {
      sfx.select();
      appendRepeat();
      return;
    }
    sfx.select();
    // appendOp routes into the latched loop if loopLatch is set.
    appendOp(op as Exclude<Op, "REPEAT">);
  };

  const onDone = () => {
    sfx.tapLow();
    releaseLoopLatch();
  };

  return (
    <div className={`palette panel${loopTargeting ? " palette-loop-mode" : ""}`}>
      <div className="palette-head">
        <span className="palette-title">{loopTargeting ? "ADDING INTO LOOP" : "COMMANDS"}</span>
        {loopTargeting && (
          <>
            <span className="palette-hint">consecutive taps fill the loop</span>
            <button
              type="button"
              className="btn-ghost btn palette-done-btn"
              onClick={onDone}
              aria-label="Done adding into loop"
            >
              DONE
            </button>
          </>
        )}
      </div>
      <div className="palette-grid">
        {mission.allowedOps.map((op) => {
          // REPEAT is not offered while loop-targeting (depth-1 rule).
          const hide = op === "REPEAT" && loopTargeting;
          if (hide) return null;
          return (
            <button
              key={op}
              type="button"
              className={`palette-chip op-${op.toLowerCase()}${disabled ? " is-disabled" : ""}`}
              onClick={() => onTap(op)}
              disabled={disabled}
              aria-label={`Add ${OP_LABEL[op]}`}
            >
              <span className="palette-glyph"><OpGlyph op={op} size={30} /></span>
              <span className="palette-label">{OP_LABEL[op]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
