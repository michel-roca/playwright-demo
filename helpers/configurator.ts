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

  let visibleIndex = -1;

  await expect
    .poll(
      async () => {
        const count = await matches.count();

        for (
          let index = 0;
          index < count;
          index += 1
        ) {
          const candidate = matches.nth(index);

          const isVisible = await candidate
            .isVisible()
            .catch(() => false);

          if (isVisible) {
            visibleIndex = index;
            return true;
          }
        }

        return false;
      },
      {
        timeout: 10_000,
        message:
          `Wachten op zichtbare configuratieoptie: ${text}`,
      },
    )
    .toBe(true);

  return matches.nth(visibleIndex);
}

/*
 * Klikt op de zichtbare knop "Volgende stap".
 */
async function isStepReady(
  configurator: Locator,
  step: ConfiguratorStep,
): Promise<boolean> {
  if (step.type === 'text') {
    return configurator
      .getByRole('textbox', {
        name: step.fieldName,
      })
      .first()
      .isVisible()
      .catch(() => false);
  }

  if (step.optionRadioName) {
    return configurator
      .getByRole('radio', {
        name: step.optionRadioName,
      })
      .first()
      .isVisible()
      .catch(() => false);
  }

  if (step.optionSelector) {
    return configurator
      .locator(step.optionSelector)
      .first()
      .isVisible()
      .catch(() => false);
  }

  if (step.optionImageName) {
    const images = configurator.getByRole(
      'img',
      {
        name: step.optionImageName,
      },
    );

    const count = await images.count();

    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      if (
        await images
          .nth(index)
          .isVisible()
          .catch(() => false)
      ) {
        return true;
      }
    }

    return false;
  }

  if (step.optionText) {
    const options = configurator.getByText(
      step.optionText,
      {
        exact:
          typeof step.optionText ===
          'string',
      },
    );

    const count = await options.count();

    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      if (
        await options
          .nth(index)
          .isVisible()
          .catch(() => false)
      ) {
        return true;
      }
    }
  }

  return false;
}

async function waitForStepReady(
  configurator: Locator,
  step: ConfiguratorStep,
  timeout = 8_000,
): Promise<void> {
  await expect
    .poll(
      async () =>
        isStepReady(
          configurator,
          step,
        ),
      {
        timeout,
        message:
          `Wachten tot configuratiestap gereed is: ${step.stepTitle}`,
      },
    )
    .toBe(true);
}

async function clickNextStep(
  configurator: Locator,
  currentStep: ConfiguratorStep,
  nextStep: ConfiguratorStep,
): Promise<void> {
  for (
    let attempt = 1;
    attempt <= 3;
    attempt += 1
  ) {
    const nextStepButton = configurator
      .locator(
        'a[data-way="next"]:visible',
      )
      .filter({
        hasText: /volgende stap/i,
      })
      .first();

    await expect(
      nextStepButton,
    ).toBeVisible({
      timeout: 8_000,
    });

    await nextStepButton.click({
      force: true,
    });

    try {
      await waitForStepReady(
        configurator,
        nextStep,
        6_000,
      );

      return;
    } catch {
      if (attempt === 3) {
        throw new Error(
          `Configuratiestap is niet doorgegaan van ${currentStep.stepTitle} naar ${nextStep.stepTitle}`,
        );
      }
    }
  }
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

  /*
   * Radio-opties worden rechtstreeks via hun
   * toegankelijke naam geselecteerd.
   */
  if (step.optionRadioName) {
    const radio = configurator
      .getByRole('radio', {
        name: step.optionRadioName,
      })
      .first();

    await expect(radio).toBeVisible({
      timeout: 10_000,
    });

    /*
     * "Voor binnen" is meestal al standaard geselecteerd.
     * Alleen selecteren wanneer dat nog niet zo is.
     */
    if (!(await radio.isChecked())) {
      await radio.check();
    }

    await expect(radio).toBeChecked();

    return;
  }

  let option: Locator;

  if (step.optionSelector) {
    option = configurator
      .locator(step.optionSelector)
      .first();
  } else if (step.optionImageName) {
    const images = configurator.getByRole(
      'img',
      {
        name: step.optionImageName,
      },
    );

    let visibleImageIndex = -1;

    await expect
      .poll(
        async () => {
          const count = await images.count();

          for (
            let index = 0;
            index < count;
            index += 1
          ) {
            if (
              await images
                .nth(index)
                .isVisible()
                .catch(() => false)
            ) {
              visibleImageIndex = index;
              return true;
            }
          }

          return false;
        },
        {
          timeout: 10_000,
          message:
            `Wachten op zichtbare configuratieafbeelding: ${step.optionImageName}`,
        },
      )
      .toBe(true);

    option = images
      .nth(visibleImageIndex)
      .locator('..');
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
      step,
      nextStep,
    );
  }
}