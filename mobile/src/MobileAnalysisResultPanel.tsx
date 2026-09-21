import {
  NETWORKS,
} from "../../src/lib/networks/registry";

import type {
  MobileAnalysisResult,
} from "./mobileIntelligence";

import {
  buildMobileResultSummary,
} from "./mobileResultSummary";

function shortAddress(
  value: string
) {
  if (value.length <= 24) {
    return value;
  }

  return (
    `${value.slice(0, 10)}` +
    "..." +
    `${value.slice(-8)}`
  );
}

function displayValue(
  value: string | null
) {
  if (!value) {
    return "Not reported";
  }

  return value
    .replace(/[-_]/g, " ")
    .replace(
      /^./,
      (letter) =>
        letter.toUpperCase()
    );
}

export default function MobileAnalysisResultPanel({
  result,
}: {
  result: MobileAnalysisResult;
}) {
  const summary =
    buildMobileResultSummary(
      result.data
    );

  const network =
    NETWORKS[
      result.networkId
    ];

  return (
    <article className="analysis-result-panel">
      <div className="analysis-result-header">
        <div>
          <div className="eyebrow">
            LIVE INTELLIGENCE
          </div>
          <h2>Evidence result</h2>
        </div>

        <span className="analysis-result-live">
          LIVE
        </span>
      </div>

      <div className="analysis-target">
        <strong>
          {network.name}
        </strong>
        <span>
          {shortAddress(
            result.address
          )}
        </span>
      </div>

      <div className="analysis-result-metrics">
        <div>
          <span>Coverage</span>
          <strong>
            {displayValue(
              summary.coverage
            )}
          </strong>
        </div>

        <div>
          <span>Findings</span>
          <strong>
            {summary.findings.length}
          </strong>
        </div>

        <div>
          <span>Evidence modules</span>
          <strong>
            {summary.modules.length}
          </strong>
        </div>
      </div>

      {summary.findings.length > 0 && (
        <div className="analysis-result-group">
          <div className="analysis-result-title">
            Findings
          </div>

          {summary.findings
            .slice(0, 6)
            .map((finding) => (
              <div
                className="analysis-finding"
                key={finding.id}
              >
                <div className="analysis-finding-top">
                  <strong>
                    {finding.title}
                  </strong>

                  {finding.confidence && (
                    <span>
                      {finding.confidence}
                    </span>
                  )}
                </div>

                {finding.summary && (
                  <p>
                    {finding.summary}
                  </p>
                )}

                <div className="analysis-finding-meta">
                  {finding.category && (
                    <span>
                      {finding.category}
                    </span>
                  )}

                  {finding.severity && (
                    <span>
                      {finding.severity}
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {summary.modules.length > 0 && (
        <div className="analysis-result-group">
          <div className="analysis-result-title">
            Evidence coverage
          </div>

          {summary.modules.map(
            (module) => (
              <div
                className="analysis-module-row"
                key={module.id}
              >
                <div>
                  <strong>
                    {module.label}
                  </strong>

                  {module.detail && (
                    <span>
                      {module.detail}
                    </span>
                  )}
                </div>

                <span className="analysis-module-status">
                  {displayValue(
                    module.status
                  )}
                </span>
              </div>
            )
          )}
        </div>
      )}

      {summary.caveats.length > 0 && (
        <div className="analysis-result-group">
          <div className="analysis-result-title">
            Coverage notes
          </div>

          {summary.caveats
            .slice(0, 4)
            .map(
              (
                caveat,
                index
              ) => (
                <p
                  className="analysis-caveat"
                  key={`${index}-${caveat}`}
                >
                  {caveat}
                </p>
              )
            )}
        </div>
      )}

      {summary.findings.length === 0 &&
        summary.modules.length === 0 && (
          <div className="analysis-empty">
            Analysis completed, but no structured
            findings or module status was returned.
          </div>
        )}
    </article>
  );
}
