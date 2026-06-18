import {
  expect,
  Locator,
} from '@playwright/test';

import {
  ConfiguratorStep,
} from '../config/shops';

/*
 * Zoekt het eerste zichtbare element dat exact bij de
 * opgegeven tekst of reguliere expressie past.
 */
async function getFirstVisibleTextMatch(
  root: Locator,
  text: string | RegExp,
): Promise<Locator> {
  const matches = root.getByText(text, {
    exact: typeof text === 'string',
  });

  const count = await matches.count();

  for (let index = 0; index < count; index += 1) {
    const candidate = matches.nth(index);

    if (
      await candidate
        .isVisible()
        .catch(() => false)
    ) {
      return candidate;
    }
  }

  throw new Error(
    `Geen zichtbare configuratieoptie gevonden voor: ${text}`,
  );
}

/*
 * Klikt op de zichtbare knop "Volgende stap".
 */
async function clickNextStep(
  configurator: Locator,
  nextStep: ConfiguratorStep,
): Promise<void> {
  const getNextStepButton = () =>
    configurator
      .locator(
        '.step-wrap:visible a[data-way="next"]:visible',
      )
      .filter({
        hasText: /volgende stap/i,
      })
      .first();

  /*
   * Controleer echte zichtbaarheid, niet de classes
   * "visible" en "active" van het thema.
   */
  const nextStepPanel = configurator
    .locator('.step-wrap:visible')
    .filter({
      hasText: nextStep.stepTitle,
    })
    .first();

  const nextStepButton =
    getNextStepButton();

  await expect(
    nextStepButton,
  ).toBeVisible({
    timeout: 10_000,
  });

  await nextStepButton.evaluate(
    (element) => {
      element.scrollIntoView({
        block: 'center',
        inline: 'center',
      });
    },
  );

  try {
    await nextStepButton.click({
      timeout: 3_000,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    const isAnimationOrOverlay =
      /intercepts pointer events|not stable|not visible/i.test(
        message,
      );

    if (!isAnimationOrOverlay) {
      throw error;
    }

    /*
     * De configurator rendert de knop tijdens
     * de overgang opnieuw. Zoek hem daarom opnieuw.
     */
    const freshNextStepButton =
      getNextStepButton();

    await expect(
      freshNextStepButton,
    ).toBeAttached({
      timeout: 5_000,
    });

    await freshNextStepButton.evaluate(
      (element) => {
        (
          element as HTMLElement
        ).click();
      },
    );
  }

  await expect(
    nextStepPanel,
  ).toBeVisible({
    timeout: 10_000,
  });
}

/*
 * Rondt de configuratie af.
 *
 * Een DOM-click is hier nodig omdat sticky onderdelen
 * op deze webshop soms de normale pointer-click onderscheppen.
 */
async function finishConfiguration(
  configurator: Locator,
): Promise<void> {
  const finishStepsButton = configurator
    .locator(
      'a[data-way="fin"]:visible',
    )
    .filter({
      hasText:
        /stappen afronden/i,
    })
    .first();

  await expect(
    finishStepsButton,
  ).toBeVisible();

  await finishStepsButton.evaluate(
    (element) => {
      (element as HTMLElement).click();
    },
  );
}

/*
 * Voert één tekststap uit.
 */
async function executeTextStep(
  configurator: Locator,
  step: Extract<
    ConfiguratorStep,
    { type: 'text' }
  >,
): Promise<void> {
  await expect(
    configurator,
  ).toContainText(
    step.stepTitle,
  );

  const input = configurator
    .getByRole('textbox', {
      name:
        step.fieldName,
    })
    .first();

  await expect(
    input,
  ).toBeVisible();

  await input.fill(
    step.value,
  );

  /*
   * Activeert eventuele change- en blur-logica.
   */
  await input.press('Tab');

  await expect(
    input,
  ).toHaveValue(
    step.value,
  );
}

/*
 * Voert één keuzestap uit.
 */
async function executeChoiceStep(
  configurator: Locator,
  step: Extract<
    ConfiguratorStep,
    { type: 'choice' }
  >,
): Promise<void> {
  /*
   * Zoek uitsluitend binnen de stap die werkelijk
   * zichtbaar is. De configurator houdt oude stappen
   * namelijk in de DOM.
   */
  const activeStep = configurator
    .locator('.step-wrap:visible')
    .filter({
      hasText: step.stepTitle,
    })
    .first();

  await expect(
    activeStep,
  ).toBeVisible({
    timeout: 15_000,
  });

  /*
   * Radio-opties moeten via het echte radio-element
   * worden geselecteerd. Klik niet op de losse tekst.
   */
  if (step.optionText) {
    const radio = activeStep
      .getByRole('radio', {
        name: step.optionText,
      })
      .first();

    if (
      await radio
        .count()
        .catch(() => 0)
    ) {
      /*
       * "Voor binnen - standaard" is meestal al
       * standaard geselecteerd. In dat geval hoeft
       * er helemaal niet geklikt te worden.
       */
      const isChecked = await radio
        .isChecked()
        .catch(() => false);

      if (!isChecked) {
        await radio.check({
          force: true,
        });
      }

      await expect(
        radio,
      ).toBeChecked({
        timeout: 10_000,
      });

      return;
    }
  }

  let option: Locator;

  if (step.optionSelector) {
    option = activeStep
      .locator(step.optionSelector)
      .first();
  } else if (step.optionImageName) {
    const image = activeStep
      .getByRole('img', {
        name: step.optionImageName,
      })
      .first();

    await expect(
      image,
    ).toBeVisible({
      timeout: 15_000,
    });

    /*
     * Klik op de volledige image-option en niet
     * uitsluitend op de afbeelding.
     */
    const imageOption = image.locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " image-option ")][1]',
    );

    option =
      await imageOption.count() > 0
        ? imageOption
        : image.locator('..');
  } else if (step.optionText) {
    const textMatch =
      await getFirstVisibleTextMatch(
        activeStep,
        step.optionText,
      );

    /*
     * Gebruik bij custom opties de volledige
     * klikbare wrapper.
     */
    const customOption =
      textMatch.locator(
        'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " custom-option ")][1]',
      );

    option =
      await customOption.count() > 0
        ? customOption
        : textMatch;
  } else {
    throw new Error(
      `Geen locator ingesteld voor configuratiestap: ${step.stepTitle}`,
    );
  }

  await expect(
    option,
  ).toBeVisible({
    timeout: 15_000,
  });

  /*
   * De configurator animeert opties en de sticky
   * header kan normale pointer-clicks onderscheppen.
   * Daarom klikken we op de daadwerkelijke wrapper
   * via de DOM.
   */
  await option.evaluate(
    (element) => {
      element.scrollIntoView({
        block: 'center',
        inline: 'center',
      });

      (
        element as HTMLElement
      ).click();
    },
  );
}

/*
 * Doorloopt alle geconfigureerde stappen.
 *
 * Na iedere stap wordt op "Volgende stap" geklikt,
 * behalve na de laatste stap. Dan wordt de
 * configuratie afgerond.
 */
export async function runConfigurator(
  configurator: Locator,
  steps: ConfiguratorStep[],
): Promise<void> {
  await expect(
    configurator,
  ).toBeVisible();

  for (
    let index = 0;
    index < steps.length;
    index += 1
  ) {
    const step = steps[index];

    if (step.type === 'text') {
      await executeTextStep(
        configurator,
        step,
      );
    }

    if (step.type === 'choice') {
      await executeChoiceStep(
        configurator,
        step,
      );
    }

    const isLastStep =
      index === steps.length - 1;

    if (isLastStep) {
      await finishConfiguration(
        configurator,
      );

      continue;
    }

    const nextStep =
      steps[index + 1];

    await clickNextStep(
      configurator,
      nextStep,
    );
  }
}