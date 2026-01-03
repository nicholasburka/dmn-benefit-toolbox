import { createSignal, Show } from "solid-js";
import FormRenderer from "../screener/FormRenderer";
import EligibilityResults from "../screener/EligibilityResults";
import Loading from "@/components/Loading";

import ssiFormSchema from "./ssiFormSchema.json";
import {
  formDataToSituation,
  eligibilityToScreenerResult,
  type SSIFormData,
  type SSIEligibilityResult
} from "./ssiUtils";

const LIBRARY_API_URL = import.meta.env.VITE_LIBRARY_API_URL || "http://localhost:8083/api/v1";

export default function SSIScreener() {
  const [screenerResult, setScreenerResult] = createSignal<any>();
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string>();

  const submitForm = async (formData: SSIFormData) => {
    // Reset previous results and errors
    setError(undefined);

    // Only validate the core required fields
    if (!formData.dateOfBirth || !formData.citizenshipStatus || formData.isBlindOrDisabled === undefined) {
      return; // Form validation will handle displaying errors
    }

    setIsLoading(true);

    try {
      // Transform form data to tSituation format
      const situationPayload = formDataToSituation(formData);

      // Call library-api SSI eligibility endpoint
      const response = await fetch(`${LIBRARY_API_URL}/benefits/federal/ssi-eligibility`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(situationPayload),
      });

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      const result: SSIEligibilityResult = await response.json();

      // Convert to screener result format
      const screenerResultData = eligibilityToScreenerResult(result);
      setScreenerResult(screenerResultData);
    } catch (err) {
      console.error("Error evaluating SSI eligibility:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to evaluate eligibility. Please ensure library-api is running at " + LIBRARY_API_URL
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto py-6 px-4">
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div class="bg-blue-600 text-white p-6">
            <h1 class="text-3xl font-bold">SSI Eligibility Screener</h1>
            <p class="mt-2 text-blue-100">
              Check your eligibility for Supplemental Security Income (SSI)
            </p>
          </div>

          {/* Content */}
          <div class="flex flex-col lg:flex-row">
            {/* Form Section */}
            <div class="flex-1 p-6 lg:border-r border-gray-200">
              <FormRenderer
                schema={ssiFormSchema}
                submitForm={submitForm}
              />

              <Show when={error()}>
                <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p class="text-red-800 text-sm">
                    <strong>Error:</strong> {error()}
                  </p>
                </div>
              </Show>
            </div>

            {/* Results Section */}
            <div class="flex-1 p-6">
              <Show when={isLoading()}>
                <Loading />
              </Show>

              <Show when={!isLoading() && screenerResult()}>
                <EligibilityResults screenerResult={screenerResult} />
              </Show>

              <Show when={!isLoading() && !screenerResult() && !error()}>
                <div class="text-center text-gray-500 py-12">
                  <svg
                    class="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p class="mt-4 text-lg">Complete the form to check your eligibility</p>
                  <p class="mt-2 text-sm">Your results will appear here</p>
                </div>
              </Show>
            </div>
          </div>

          {/* Footer / Disclaimer */}
          <div class="bg-gray-50 border-t border-gray-200 p-6">
            <div class="text-xs text-gray-600 space-y-2">
              <p>
                <strong>What this screener checks:</strong>
              </p>
              <ul class="list-disc list-inside ml-2 space-y-1">
                <li><strong>Categorical eligibility:</strong> Age 65+ OR blind OR disabled</li>
                <li><strong>Citizenship eligibility:</strong> U.S. citizen OR qualified alien status with time validations:
                  <ul class="list-circle list-inside ml-4 mt-1">
                    <li>Refugees/Asylees: Validates 7-year time limit from admission/grant date</li>
                    <li>Cuban/Haitian Entrants, Vietnamese Amerasians, Withheld Deportation: Validates status dates</li>
                  </ul>
                </li>
              </ul>
              <p class="mt-2">
                <strong>Current limitations:</strong>
              </p>
              <ul class="list-disc list-inside ml-2 space-y-1">
                <li><strong>Lawful Permanent Residents (LPR):</strong> Does not yet validate LPR-specific requirements (40 qualifying work quarters, military service, or other exceptions per POMS SI 00502.100)</li>
                <li><strong>Income, resources, residence:</strong> These critical SSI requirements are not evaluated</li>
              </ul>
              <p class="mt-2">
                For complete eligibility determination, please contact your local Social Security office
                or visit <a href="https://www.ssa.gov/ssi/" class="text-blue-600 hover:underline" target="_blank">ssa.gov/ssi</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
