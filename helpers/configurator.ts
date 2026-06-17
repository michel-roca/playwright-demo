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
  await expect(configurator).toContainText(
    step.stepTitle,
  );

  let option: Locator;

  if (step.optionSelector) {
    option = configurator
      .locator(step.optionSelector)
      .first();
  } else if (step.optionImageName) {
    const image = configurator
      .getByRole('img', {
        name: step.optionImageName,
      })
      .first();

    await expect(image).toBeVisible();

    option = image.locator('..');
  } else if (step.optionText) {
    option = await getFirstVisibleTextMatch(
      configurator,
      step.optionText,
    );
  } else {
    throw new Error(
      `Geen locator ingesteld voor configuratiestap: ${step.stepTitle}`,
    );
  }

  await expect(option).toBeVisible();
  await option.click();
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