export type BaseTestProduct = {
  sku: string;
  path: string;

  pageTitle: RegExp;
  cartTitle: RegExp;

  expectedUnitPrice?: RegExp;
  expectHandlingFee: boolean;
  expectedHandlingFee?: RegExp;
};

export type TextConfiguratorStep = {
  type: 'text';

  /*
   * Tekst waarmee we controleren dat de juiste stap zichtbaar is.
   */
  stepTitle: RegExp;

  /*
   * Accessible name van het invoerveld.
   */
  fieldName: RegExp;

  /*
   * Waarde die in het veld wordt ingevoerd.
   */
  value: string;

  /*
   * Tekst die uiteindelijk in de cart moet staan.
   */
  expectedCartText: RegExp;
};

export type ChoiceConfiguratorStep = {
  type: 'choice';

  stepTitle: RegExp;

  optionText?: RegExp;
  optionSelector?: string;
  optionImageName?: RegExp;

  expectedCartText: RegExp;
};

export type ConfiguratorStep =
  | TextConfiguratorStep
  | ChoiceConfiguratorStep;

export type ConfigurableTestProduct =
  BaseTestProduct & {
    type: 'configurable';

    /*
     * De stappen worden in deze volgorde doorlopen.
     */
    steps: ConfiguratorStep[];
  };

export type StandardTestProduct =
  BaseTestProduct & {
    type: 'standard';
    variantTitle?: RegExp;
    quantity: number;
    expectedUnitPrice: RegExp;
    expectedCartLinePrice?: RegExp;
  };

export type ShopConfig = {
  name: string;
  baseUrl: string;
  categoryPath: string;
  cartPath: string;
  branch: 'aluminium';
  locale: 'nl';

  selectors: {
    configurator: string;
    addToCartButton: string;
    standardQuantityInput: string;
  };

  testProducts: {
    configurable: ConfigurableTestProduct;
    standard: StandardTestProduct;
  };
};

export const shops: ShopConfig[] = [
  {
    name: 'ALUMINIUMvakman.nl',

    baseUrl:
      'https://www.aluminiumvakman.nl',

    categoryPath:
      '/aluminium-profielen/aluminium-hoekprofiel/',

    cartPath:
      '/cart/',

    branch:
      'aluminium',

    locale:
      'nl',

    selectors: {
      configurator:
        'main .product-configure-module:visible',

      addToCartButton:
        'main a.add-cart.cart-btn:visible',

      /*
       * Controleer deze selector later bij het standaardproduct.
       */
      standardQuantityInput:
        'main input[name="quantity"]:visible',
    },

    testProducts: {
      configurable: {
        type:
          'configurable',

        sku:
          'hoek-30x30x2-ral9004',

        path:
          '/aluminium-hoekprofiel-zwart-30x30x2-mm-copy.html',

        pageTitle:
          /aluminium hoekprofiel.*30x30x2 mm/i,

        cartTitle:
          /aluminium hoekprofiel.*30x30x2 mm/i,

        /*
         * Zet deze prijs pas vast wanneer de uiteindelijke
         * testconfiguratie en prijs definitief zijn.
         *
         * Bijvoorbeeld:
         * expectedUnitPrice: /€\s*29[,.]90/i,
         */
        expectedUnitPrice:
          /€\s*29[,.]90/i,

        expectHandlingFee:
          true,

        expectedHandlingFee:
          /€\s*17[,.]95/i,

        steps: [
          /*
           * Stap 1 - lengte
           */
          {
            type:
              'text',

            stepTitle:
              /lengte in millimeters/i,

            fieldName:
              /lengte/i,

            value:
              '100',

            expectedCartText:
              /lengte:\s*100/i,
          },

          /*
           * Stap 2 - RAL-kleur
           */
          {
            type:
              'choice',

            stepTitle:
              /kies uw ral kleur/i,

            optionImageName:
              /ral 9005/i,

            expectedCartText:
              /ral 9005/i,
          },

          /*
           * Stap 3 - coating
           */
          {
            type:
              'choice',

            stepTitle:
              /coating voor binnen of buiten/i,

            optionText:
              /^voor binnen - standaard$/i,

            expectedCartText:
              /voor binnen - standaard/i,
          },

          /*
           * Stap 4 - zaagsnede
           *
           * Door recht afgezaagd te kiezen worden de
           * conditionele verstekstappen niet geopend.
           */
          {
            type:
              'choice',

            stepTitle:
              /kies uw zaagsnede/i,

            optionImageName:
              /^recht afgezaagd \(standaard\)$/i,

            expectedCartText:
              /recht afgezaagd/i,
          },
        ],
      },

      standard: {
        type:
          'standard',

        sku:
          'Lakstift-9016',

        path:
          '/lakstift-tbv-coating-20-ml-lak-copy.html',

        pageTitle:
          /lakstift.*20 ml.*testproduct/i,
        
        cartTitle:
          /lakstift.*20 ml/i,
        
        variantTitle:
          /ral 9005.*gitzwart/i,

        quantity:
          2,

        expectedUnitPrice:
          /€\s*12[,.]00/i,

        expectHandlingFee:
          true,
        
        expectedHandlingFee:
          /€\s*17[,.]95/i,
      },
    },
  },
];