import "dotenv/config";
import { initSentry } from "./sentry.js";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

initSentry();

// ── OpenTelemetry ─────────────────────────────────────────────────────────────
// Only initialise when an OTLP endpoint is configured. This avoids adding
// overhead in local dev unless the developer has a collector running.
const OTLP_ENDPOINT = process.env.OTLP_ENDPOINT; // e.g. http://localhost:4318

if (OTLP_ENDPOINT) {
  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "linguadapt",
    traceExporter: new OTLPTraceExporter({
      url: `${OTLP_ENDPOINT}/v1/traces`,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${OTLP_ENDPOINT}/v1/metrics`,
      }),
      exportIntervalMillis: 30_000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Reduce noise from fs / dns auto-instrumentation
        "@opentelemetry/instrumentation-fs":  { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on("SIGTERM", () => sdk.shutdown().catch(console.error));
  process.on("SIGINT",  () => sdk.shutdown().catch(console.error));

  console.log(`[otel] SDK started — exporting to ${OTLP_ENDPOINT}`);
} else {
  if (process.env.NODE_ENV !== "production") {
    console.log("[otel] OTLP_ENDPOINT not set — OpenTelemetry disabled (set OTLP_ENDPOINT to enable)");
  }
}
