"use client";

import { useState } from "react";

import { ResumeResult } from "@/components/ResumeResult";
import { Button, Input, Label } from "@/components/ui";
import { getJobStatus, retryParse, type CallResult } from "@/lib/api";
import type { JobStatusResponse, RetryResponse } from "@/lib/types";

import { Dropzone, EndpointHeader, ResponseCard, useCall } from "./shared";

export function JobPanel() {
  const [jobId, setJobId] = useState("");
  const status = useCall<JobStatusResponse>();
  const retry = useCall<RetryResponse>();

  const statusBody = status.result?.data;
  const retryBody = retry.result?.data;

  return (
    <div>
      <EndpointHeader method="GET" path="/api/v1/resume/job/{job_id}" title="Job status & retry" blurb="Poll an asynchronous parse job by its ID, or re-run a job by re-uploading the same file. Retrying runs the full extraction + AI pipeline again under a new linked job ID." />

      <div className="space-y-2">
        <Label>Job ID</Label>
        <div className="flex gap-2">
          <Input value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="01J3K5M2N4P6Q8R0S2T4U6V8W0" className="font-mono" />
          <Button className="shrink-0" loading={status.loading} disabled={!jobId.trim()} onClick={() => run(status, () => getJobStatus(jobId.trim()))}>
            Get status
          </Button>
        </div>
      </div>

      {statusBody?.data ? (
        <ResponseCard result={status.result as CallResult<unknown>} title="GET /resume/job/{job_id}">
          <div className="mb-4 rounded-2xl border border-[var(--line)] bg-[var(--bg)]/40 p-4">
            <ResumeResult data={statusBody.data} confidence={statusBody.confidence ?? null} skillsValidation={statusBody.skills_validation ?? null} />
          </div>
        </ResponseCard>
      ) : (
        <ResponseCard result={status.result as CallResult<unknown>} title="GET /resume/job/{job_id}" />
      )}

      {/* Retry */}
      <div className="mt-8 border-t border-[var(--line)] pt-6">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="rounded-md border border-[var(--line)] bg-[var(--bg-elev)] px-2 py-0.5 font-mono text-[11px] font-bold text-teal-600 dark:text-teal-400">POST</span>
          <code className="font-mono text-[13px] text-[var(--muted)]">/api/v1/resume/{"{job_id}"}/retry</code>
        </div>
        <p className="mb-4 text-sm text-[var(--muted)]">Re-parse the job above by re-uploading the same file.</p>
        {jobId.trim() ? (
          <Dropzone compact accept=".pdf,.docx,.rtf,.png,.jpg,.jpeg,.tiff,.tif,.webp" onFiles={(fs) => run(retry, () => retryParse(jobId.trim(), fs[0]))} hint="re-upload to retry" />
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-6 text-center text-sm text-[var(--muted)]">Enter a Job ID above to enable retry.</p>
        )}
        {retryBody?.data ? (
          <ResponseCard result={retry.result as CallResult<unknown>} title="POST /resume/{job_id}/retry">
            <div className="mb-4 rounded-2xl border border-[var(--line)] bg-[var(--bg)]/40 p-4">
              <ResumeResult data={retryBody.data} confidence={retryBody.confidence ?? null} skillsValidation={retryBody.skills_validation ?? null} />
            </div>
          </ResponseCard>
        ) : (
          <ResponseCard result={retry.result as CallResult<unknown>} title="POST /resume/{job_id}/retry" />
        )}
      </div>
    </div>
  );
}

// small helper so both cards share the loading-managed runner
function run<T>(c: { run: (fn: () => Promise<CallResult<T>>) => Promise<CallResult<T>> }, fn: () => Promise<CallResult<T>>) {
  return c.run(fn);
}
