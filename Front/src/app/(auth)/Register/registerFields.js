export const registerFields = [
    //Los validate están comentados ya que aún no lo tengo hechos y asi no causan problemas.
    //Datos Obligatorios (Se le muestra a todo usuario que se va a registrar)
    {
        name: "email",
        label: "Email",
        type: "text",
        initialValues: "",
        // validate: validateEmail
    },
    {
        name: "password",
        label: "Contraseña",
        type: "password",
        initialValues: "",
        // validate: validatePassword
    },
    {
        name: "confirmPassword",
        label: "Confirmar Contraseña",
        type: "password",
        initialValues: "",
        // validate: validatePassword
    },
    {
        name: "name",
        label: "Nombre",
        type: "text",
        initialValues: "",
        // validate: validateName
    },
    {
        name: "roles",
        label: "Tipo de Usuario",
        type: "select",
        initialValues: "CLIENT",
        options: [
            {value: "CLIENT", label: "Cliente"},
            {value: "ARTIST", label: "Artista"},
            {value: "STUDIO", label: "Estudio"},
        ],
},
    //Opcionales Personales si es artista
    {
        name: "artistName",
        label: "Nombre Artistico",
        type: "text",
        initialValues: "",
        // validate: validateArtistName
    },
    {
        name: "alias",
        label: "Alias",
        type: "text",
        initialValues: "",
        // validate: validateAlias
    },
    {
        name: "phone",
        label: "Número de télefono",
        type: "text",
        initialValues: "",
        // validate: validatePhone
    },
    {
        name: "nDni",
        label: "DNI",
        type: "number",
        initialValues: "",
        // validate: validateDni
    },
    //Opcionales de Ubicación (Artista y estudios)
    {
        name: "workType",
        label: "Estudio",
        type: "text",
        initialValues: "",
        // validate: validateWorkType
    },
    {
        name: "adress",
        label: "Dirección",
        type: "text",
        initialValues: "",
        // validate: validateAdress
    },
    {
        name: "city",
        label: "Ciudad",
        type: "text",
        initialValues: "",
        // validate: validateCity
    },
    {
        name: "country",
        label: "País",
        type: "text",
        initialValues: "",
        // validate: validateCountry
    },
    {
        name: "availabilityHours",
        label: "Horarios de atención",
        type: "text",
        initialValues: "",
        // validate: validateAvailabilityHours
    },

    // Step 3: Profile and portfolio (Artista y Estudios)
    {
        name: "mainStyles",
        label: "Estilos principales",
        type: "text",
        initialValues: [],
        // validate: validateMainStyles
    },
    {
        name: "instagram",
        label: "Instagram",
        type: "text",
        initialValues: "",
        // validate: validateInstagram
    },
    {
        name: "tiktok",
        label: "TikTok",
        type: "text",
        initialValues: "",
        // validate: validateTiktok
    },
    {
        name: "yearsOfExperience",
        label: "Años de experiencia",
        type: "number",
        initialValues: "",
        // validate: validateYearsOfExperience
    },
    {
        name: "gallery",
        label: "Galería",
        type: "array",
        initialValues: [],
        // validate: validateGallery
    },

    // Step 4: Pricing (Artistas)
    {
        name: "minimumRate",
        label: "Tarifa mínima",
        type: "number",
        initialValues: "",
        // validate: validateMinimumRate
    },
    {
        name: "paymentMethod",
        label: "Modalidad de cobro",
        type: "text",
        initialValues: "",
        // validate: validatePaymentMethod
    },
    {
        name: "requiresDeposit",
        label: "¿Requiere seña?",
        type: "checkbox",
        initialValues: false,
        // validate: validateRequiresDeposit
    },
    {
        name: "depositAmountOrPercentage",
        label: "Monto o porcentaje de seña",
        type: "text",
        initialValues: "",
        // validate: validateDepositAmountOrPercentage
    },
    {
        name: "cancellationPolicy",
        label: "Política de cancelación",
        type: "text",
        initialValues: "",
        // validate: validateCancellationPolicy
    },
    {
        name: "acceptedPaymentMethods",
        label: "Métodos de pago aceptados",
        type: "text",
        initialValues: [],
        // validate: validateAcceptedPaymentMethods
    },
    {
        name: "bankAccountAlias",
        label: "CBU o alias bancario",
        type: "text",
        initialValues: "",
        // validate: validateBankAccountAlias
    },

    // Step 5: Verification documents (Artistas)
    {
        name: "licenseNumber",
        label: "Número de licencia",
        type: "text",
        initialValues: "",
        // validate: validateLicenseNumber
    },
    {
        name: "healthLicenseUrl",
        label: "Licencia sanitaria",
        type: "file",
        initialValues: "",
        // validate: validateHealthLicenseUrl
    },
    {
        name: "acceptsHygieneDeclaration",
        label: "Acepta la declaración de higiene",
        type: "checkbox",
        initialValues: false,
        // validate: validateAcceptsHygieneDeclaration
    },
    {
        name: "acceptsCoverUps",
        label: "Acepta cover-ups",
        type: "checkbox",
        initialValues: false,
        // validate: validateAcceptsCoverUps
    },
    {
        name: "acceptsScarWork",
        label: "Acepta trabajar sobre cicatrices",
        type: "checkbox",
        initialValues: false,
        // validate: validateAcceptsScarWork
    },
    {
        name: "acceptsTouchUps",
        label: "Acepta retoques",
        type: "checkbox",
        initialValues: false,
        // validate: validateAcceptsTouchUps
    },
    {
        name: "acceptsFaceAndHandTattoos",
        label: "Acepta tatuajes en cara y manos",
        type: "checkbox",
        initialValues: false,
        // validate: validateAcceptsFaceAndHandTattoos
    },
    {
        name: "copiesInternetDesigns",
        label: "Acepta copiar diseños de Internet",
        type: "checkbox",
        initialValues: false,
        // validate: validateCopiesInternetDesigns
    },
    {
        name: "minimumSizeCm",
        label: "Tamaño mínimo (cm)",
        type: "number",
        initialValues: "",
        // validate: validateMinimumSizeCm
    }
];