import { expect, type Locator, type Page } from "@playwright/test";

// Regex patterns defined at module level for performance
const CERCA_FIGURA_REGEX = /cerca figura/i;
const ADA_TEXT_REGEX = /ADA/;
const SELEZIONA_ADA_REGEX = /seleziona.*ada/i;
const CLICCA_PER_REGEX = /clicca per/i;

/**
 * Page Object Model for PF Builder E2E tests
 *
 * Provides methods to interact with the Percorso Formativo Builder canvas
 * and verify its state throughout the multi-step flow.
 */
export class PFBuilderPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ==========================================================================
  // LOCATORS
  // ==========================================================================

  get builderContainer(): Locator {
    return this.page.getByTestId("pf-builder-container");
  }

  get builderCanvas(): Locator {
    return this.page.getByTestId("pf-builder-canvas");
  }

  get qualificaButton(): Locator {
    return this.page.getByTestId("pf-select-type-qualifica");
  }

  get certificazioneButton(): Locator {
    return this.page.getByTestId("pf-select-type-certificazione");
  }

  get ufInput(): Locator {
    return this.page.getByTestId("pf-uf-input");
  }

  get ufAddButton(): Locator {
    return this.page.getByTestId("pf-uf-add-button");
  }

  get ufList(): Locator {
    return this.page.getByTestId("pf-uf-list");
  }

  get ufItems(): Locator {
    return this.page.getByTestId("pf-uf-item");
  }

  get sectorSelects(): Locator {
    return this.page.getByTestId("pf-sector-select");
  }

  get figureSelects(): Locator {
    return this.page.getByTestId("pf-figure-select");
  }

  get adaItems(): Locator {
    return this.page.getByTestId("pf-ada-item");
  }

  get capacitaItems(): Locator {
    return this.page.getByTestId("pf-capacita-item");
  }

  get conoscenzaItems(): Locator {
    return this.page.getByTestId("pf-conoscenza-item");
  }

  get nextButton(): Locator {
    return this.page.getByTestId("pf-next-button");
  }

  get backButton(): Locator {
    return this.page.getByTestId("pf-back-button");
  }

  get summaryStep(): Locator {
    return this.page.getByTestId("pf-summary-step");
  }

  get createDocumentButton(): Locator {
    return this.page.getByTestId("pf-create-document-button");
  }

  get completeButton(): Locator {
    return this.page.getByTestId("pf-complete-button");
  }

  get multimodalInput(): Locator {
    return this.page.getByTestId("multimodal-input");
  }

  get sendButton(): Locator {
    return this.page.getByTestId("send-button");
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  /**
   * Navigate directly to the PF Builder test page
   */
  async openBuilder(): Promise<void> {
    await this.page.goto("/chat/builder");
    await this.waitForBuilderReady();
  }

  /**
   * Wait for the builder to be fully loaded
   */
  async waitForBuilderReady(): Promise<void> {
    await expect(this.builderContainer).toBeVisible({ timeout: 10_000 });
  }

  /**
   * Click the Next button to proceed to the next step
   */
  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }

  /**
   * Click the Back button to go to the previous step
   */
  async clickBack(): Promise<void> {
    await this.backButton.click();
  }

  // ==========================================================================
  // SELECT TYPE STEP
  // ==========================================================================

  /**
   * Select "Qualifica" type to start the builder flow
   */
  async selectQualifica(): Promise<void> {
    await expect(this.qualificaButton).toBeVisible({ timeout: 5000 });
    await this.qualificaButton.click();
  }

  /**
   * Verify that we're on the Select Type step
   */
  async expectSelectTypeStep(): Promise<void> {
    await expect(this.qualificaButton).toBeVisible();
  }

  // ==========================================================================
  // UF INPUT STEP
  // ==========================================================================

  /**
   * Add a new Unità Formativa with the given name
   */
  async addUf(name: string): Promise<void> {
    await this.ufInput.fill(name);
    await this.ufAddButton.click();
  }

  /**
   * Add multiple UFs at once
   */
  async addMultipleUfs(names: string[]): Promise<void> {
    for (const name of names) {
      await this.addUf(name);
    }
  }

  /**
   * Get the count of UF items in the list
   */
  async getUfCount(): Promise<number> {
    return await this.ufItems.count();
  }

  /**
   * Verify that a specific UF exists in the list
   */
  async expectUfToExist(name: string): Promise<void> {
    await expect(this.ufList.getByText(name)).toBeVisible();
  }

  /**
   * Verify we're on the UF Input step
   */
  async expectUfInputStep(): Promise<void> {
    await expect(this.ufInput).toBeVisible();
  }

  // ==========================================================================
  // UF SECTOR STEP
  // ==========================================================================

  /**
   * Select a sector for a UF at the given index (0-based)
   */
  async selectSectorForUf(ufIndex: number, sector: string): Promise<void> {
    const selects = await this.sectorSelects.all();
    if (selects.length <= ufIndex) {
      throw new Error(
        `UF index ${ufIndex} out of range (${selects.length} selects found)`
      );
    }

    await selects[ufIndex].click();
    // Wait for dropdown to open
    await this.page.waitForTimeout(200);
    // Select the sector option (capitalize first letter to match display)
    await this.page
      .getByRole("option", { name: new RegExp(sector, "i") })
      .click();
  }

  /**
   * Verify we're on the Sector step
   */
  async expectSectorStep(): Promise<void> {
    await expect(this.sectorSelects.first()).toBeVisible({ timeout: 5000 });
  }

  // ==========================================================================
  // UF FIGURE STEP
  // ==========================================================================

  /**
   * Select a figure for a UF at the given index (0-based)
   */
  async selectFigureForUf(
    ufIndex: number,
    figurePartialName: string
  ): Promise<void> {
    const selects = await this.figureSelects.all();
    if (selects.length <= ufIndex) {
      throw new Error(
        `UF index ${ufIndex} out of range (${selects.length} selects found)`
      );
    }

    await selects[ufIndex].click();
    // Wait for dropdown to open
    await this.page.waitForTimeout(200);
    // Type to search
    const searchInput = this.page.getByPlaceholder(CERCA_FIGURA_REGEX);
    if (await searchInput.isVisible()) {
      await searchInput.fill(figurePartialName);
      await this.page.waitForTimeout(300);
    }
    // Click first matching option
    await this.page.getByRole("option").first().click();
  }

  /**
   * Verify we're on the Figure step
   */
  async expectFigureStep(): Promise<void> {
    await expect(this.figureSelects.first()).toBeVisible({ timeout: 5000 });
  }

  // ==========================================================================
  // UF ADA STEP
  // ==========================================================================

  /**
   * Expand a UF card to show its ADA options
   */
  async expandUfCard(ufIndex: number): Promise<void> {
    // Click on the UF card header (which is a button that toggles expansion)
    const ufCards = this.page
      .locator("[data-testid='pf-uf-item']")
      .or(
        this.page
          .locator(".rounded-lg.border")
          .filter({ hasText: ADA_TEXT_REGEX })
      );
    const cards = await ufCards.all();

    if (cards.length > ufIndex) {
      // Click the button inside the card to expand
      await cards[ufIndex].click();
    }
  }

  /**
   * Select an ADA for a UF (first needs to expand the UF card)
   */
  async selectAdaForUf(ufIndex: number, adaIndex: number): Promise<void> {
    // First expand the UF card
    await this.expandUfCard(ufIndex);
    await this.page.waitForTimeout(300);

    // Then click on the ADA item
    const adaButtons = await this.adaItems.all();
    if (adaButtons.length <= adaIndex) {
      throw new Error(
        `ADA index ${adaIndex} out of range (${adaButtons.length} items found)`
      );
    }
    await adaButtons[adaIndex].click();
  }

  /**
   * Verify we're on the ADA step
   */
  async expectAdaStep(): Promise<void> {
    // Look for the step by checking the header text
    await expect(this.page.getByText(SELEZIONA_ADA_REGEX).first()).toBeVisible({
      timeout: 5000,
    });
  }

  // ==========================================================================
  // ADA DETAILS STEP
  // ==========================================================================

  /**
   * Select capacità items (by index, 0-based)
   */
  async selectCapacita(count: number): Promise<void> {
    const items = await this.capacitaItems.all();
    const selectCount = Math.min(count, items.length);

    for (let i = 0; i < selectCount; i++) {
      await items[i].click();
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Select conoscenze items (by index, 0-based)
   */
  async selectConoscenze(count: number): Promise<void> {
    const items = await this.conoscenzaItems.all();
    const selectCount = Math.min(count, items.length);

    for (let i = 0; i < selectCount; i++) {
      await items[i].click();
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Select both capacità and conoscenze (helper for complete ADA details)
   */
  async selectCapacitaAndConoscenze(
    capacitaCount: number,
    conoscenzeCount: number
  ): Promise<void> {
    await this.selectCapacita(capacitaCount);
    await this.selectConoscenze(conoscenzeCount);
  }

  /**
   * Verify we're on the ADA Details step
   */
  async expectAdaDetailsStep(): Promise<void> {
    await expect(this.capacitaItems.first()).toBeVisible({ timeout: 5000 });
  }

  // ==========================================================================
  // SUMMARY STEP
  // ==========================================================================

  /**
   * Set the title for the Percorso Formativo
   */
  async setTitle(title: string): Promise<void> {
    // Click on the title area to enable editing
    await this.page
      .getByText(CLICCA_PER_REGEX)
      .click()
      .catch(() => {
        // If that fails, try clicking directly on the input
      });
    await this.page.waitForTimeout(100);

    const titleInput = this.page
      .locator("input")
      .filter({ hasText: "" })
      .first();
    await titleInput.fill(title);
  }

  /**
   * Verify we're on the Summary step
   */
  async expectSummaryStep(): Promise<void> {
    await expect(this.summaryStep).toBeVisible({ timeout: 5000 });
  }

  /**
   * Click Create Document button
   */
  async createDocument(): Promise<void> {
    await this.createDocumentButton.click();
  }

  /**
   * Click Complete button to finalize the PF
   */
  async complete(): Promise<void> {
    await this.completeButton.click();
  }

  // ==========================================================================
  // CHAT INTEGRATION
  // ==========================================================================

  /**
   * Send a message in the chat (for chat-to-canvas sync tests)
   */
  async sendChatMessage(message: string): Promise<void> {
    await this.multimodalInput.click();
    await this.multimodalInput.fill(message);
    await this.sendButton.click();
  }

  /**
   * Wait for the chat response to complete
   */
  async waitForChatResponse(): Promise<void> {
    const response = await this.page.waitForResponse(
      (res) => res.url().includes("/api/chat"),
      { timeout: 30_000 }
    );
    await response.finished();
  }

  // ==========================================================================
  // ASSERTIONS
  // ==========================================================================

  /**
   * Verify the UF count matches expected
   */
  async expectUfCount(count: number): Promise<void> {
    const items = await this.ufItems.all();
    expect(items.length).toBe(count);
  }

  /**
   * Verify a toast message appears
   */
  async expectToast(text: string): Promise<void> {
    await expect(this.page.getByTestId("toast")).toContainText(text);
  }

  /**
   * Check if an element with specific test ID is visible
   */
  async isVisible(testId: string): Promise<boolean> {
    return await this.page.getByTestId(testId).isVisible();
  }
}
