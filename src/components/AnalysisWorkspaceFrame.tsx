import type {
  ReactNode,
} from "react";

import styles from "@/components/AnalysisWorkspaceConcept.module.css";

export default function AnalysisWorkspaceFrame({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <div className={styles.layout}>
      <nav
        aria-label="Analysis sections"
        className={styles.rail}
      >
        <div className={styles.brand}>
          <i>◢</i>
        </div>

        <a
          href="#analysis-overview"
          title="Analysis overview"
          className={`${styles.railLink} ${styles.railActive}`}
        >
          ◫
          <span className="sr-only">
            Analysis overview
          </span>
        </a>

        <a
          href="#visual-evidence-graph"
          title="Relationship map"
          className={styles.railLink}
        >
          ⌁
          <span className="sr-only">
            Relationship map
          </span>
        </a>

        <a
          href="#analysis-activity"
          title="Observed flows"
          className={styles.railLink}
        >
          ≋
          <span className="sr-only">
            Observed flows
          </span>
        </a>

        <a
          href="#analysis-timeline"
          title="Transactions"
          className={styles.railLink}
        >
          ▤
          <span className="sr-only">
            Transactions
          </span>
        </a>

        <div className={styles.railSpacer} />

        <span className={styles.railHint}>
          AYZO EVIDENCE
        </span>
      </nav>

      <div className={styles.mainShell}>
        {children}
      </div>
    </div>
  );
}
