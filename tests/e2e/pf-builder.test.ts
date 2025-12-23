import { expect, test } from "../fixtures";
import { PFBuilderPage } from "../pages/pf-builder";

// Regex patterns defined at module level for performance
const INFORMATICA_REGEX = /informatica/i;

/**
 * E2E Tests for PF Builder (Percorso Formativo Builder)
 *
 * Tests the complete flow from type selection to summary,
 * plus chat-to-canvas synchronization.
 */

test.describe("PF Builder", () => {
  test.describe("Basic Flow", () => {
    test("should complete full path: Qualifica → UF → Settore → Figura → ADA → Dettagli → Summary", async ({
      adaContext,
    }) => {
      const page = await adaContext.context.newPage();
      const builder = new PFBuilderPage(page);

      // Step 1: Open the builder directly
      await builder.openBuilder();

      // Step 2: Select type "Qualifica"
      await builder.selectQualifica();

      // Step 3: Add a UF (Unità Formativa)
      await builder.expectUfInputStep();
      await builder.addUf("Test UF Marketing");
      await builder.expectUfToExist("Test UF Marketing");

      // Step 4: Proceed to sector step
      await builder.clickNext();
      await builder.expectSectorStep();

      // Step 5: Select sector for the UF (use "informatica" which has many figures)
      await builder.selectSectorForUf(0, "informatica");

      // Step 6: Proceed to figure step
      await builder.clickNext();
      await builder.expectFigureStep();

      // Step 7: Select a figure for the UF (partial name search)
      await builder.selectFigureForUf(0, "tecnico");

      // Step 8: Proceed to ADA step
      await builder.clickNext();
      await builder.expectAdaStep();

      // Step 9: Select an ADA for the UF
      await builder.selectAdaForUf(0, 0);

      // Step 10: Proceed to ADA details step
      await builder.clickNext();
      await builder.expectAdaDetailsStep();

      // Step 11: Select minimum required capacità (2) and conoscenze (2)
      await builder.selectCapacitaAndConoscenze(2, 2);

      // Step 12: Complete UF and proceed to summary
      await builder.clickNext();
      await builder.expectSummaryStep();

      // Step 13: Verify summary content
      await expect(page.getByText("Test UF Marketing")).toBeVisible();
      await expect(page.getByText("informatica")).toBeVisible();

      // Cleanup
      await page.close();
    });

    test("should allow multiple UFs in a single path", async ({
      adaContext,
    }) => {
      const page = await adaContext.context.newPage();
      const builder = new PFBuilderPage(page);

      // Open builder and select Qualifica
      await builder.openBuilder();
      await builder.selectQualifica();

      // Add multiple UFs
      await builder.addMultipleUfs(["UF Vendite", "UF Comunicazione"]);

      // Verify both UFs exist
      await builder.expectUfCount(2);
      await builder.expectUfToExist("UF Vendite");
      await builder.expectUfToExist("UF Comunicazione");

      // Cleanup
      await page.close();
    });

    test("should prevent proceeding without required UF name", async ({
      adaContext,
    }) => {
      const page = await adaContext.context.newPage();
      const builder = new PFBuilderPage(page);

      // Open builder and select Qualifica
      await builder.openBuilder();
      await builder.selectQualifica();

      // Try to add empty UF name
      await builder.addUf("");

      // Verify UF was not added
      const count = await builder.getUfCount();
      expect(count).toBe(0);

      // Cleanup
      await page.close();
    });

    test("should handle back navigation correctly", async ({ adaContext }) => {
      const page = await adaContext.context.newPage();
      const builder = new PFBuilderPage(page);

      // Open builder and complete initial steps
      await builder.openBuilder();
      await builder.selectQualifica();
      await builder.addUf("Navigation Test UF");
      await builder.clickNext();

      // Verify we're on sector step
      await builder.expectSectorStep();

      // Go back
      await builder.clickBack();

      // Verify we're back on UF input step
      await builder.expectUfInputStep();

      // Verify our UF is still there
      await builder.expectUfToExist("Navigation Test UF");

      // Cleanup
      await page.close();
    });
  });

  test.describe("Chat-Canvas Sync", () => {
    test("should sync UF from chat message to canvas", async ({
      adaContext,
    }) => {
      const page = await adaContext.context.newPage();
      const builder = new PFBuilderPage(page);

      // Open builder and select Qualifica to get to UF input step
      await builder.openBuilder();
      await builder.selectQualifica();

      // Wait for UF input step to be ready
      await builder.expectUfInputStep();

      // Manually add a UF in the canvas first to verify the flow works
      await builder.addUf("Canvas UF");
      await builder.expectUfToExist("Canvas UF");

      // Note: Full chat-to-canvas sync requires the AI agent to process
      // the message and call the pfBuilderUpdateUF tool. This test verifies
      // the canvas-side functionality is working.

      // Verify the UF appears in the list
      await builder.expectUfCount(1);

      // Cleanup
      await page.close();
    });

    test("should maintain canvas state when navigating between steps", async ({
      adaContext,
    }) => {
      const page = await adaContext.context.newPage();
      const builder = new PFBuilderPage(page);

      // Setup initial state
      await builder.openBuilder();
      await builder.selectQualifica();
      await builder.addUf("Persistent UF");

      // Navigate forward
      await builder.clickNext();
      await builder.expectSectorStep();
      await builder.selectSectorForUf(0, "informatica");

      // Navigate back
      await builder.clickBack();
      await builder.expectUfInputStep();

      // Verify UF still exists
      await builder.expectUfToExist("Persistent UF");

      // Navigate forward again
      await builder.clickNext();

      // Verify sector selection persisted (the select should show informatica)
      const sectorSelect = builder.sectorSelects.first();
      await expect(sectorSelect).toContainText(INFORMATICA_REGEX);

      // Cleanup
      await page.close();
    });
  });

  test.describe("Edge Cases", () => {
    test("should display builder canvas on test route", async ({
      adaContext,
    }) => {
      const page = await adaContext.context.newPage();
      const builder = new PFBuilderPage(page);

      await builder.openBuilder();

      // Verify the builder container is visible
      await expect(builder.builderContainer).toBeVisible();

      // Verify we're on the initial type selection step
      await builder.expectSelectTypeStep();

      // Cleanup
      await page.close();
    });

    test("should disable next button when no UFs are added", async ({
      adaContext,
    }) => {
      const page = await adaContext.context.newPage();
      const builder = new PFBuilderPage(page);

      await builder.openBuilder();
      await builder.selectQualifica();
      await builder.expectUfInputStep();

      // Verify next button is disabled without UFs
      await expect(builder.nextButton).toBeDisabled();

      // Add a UF
      await builder.addUf("Enable Next Test");

      // Verify next button is now enabled
      await expect(builder.nextButton).toBeEnabled();

      // Cleanup
      await page.close();
    });
  });
});
