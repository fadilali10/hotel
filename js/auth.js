/* =========================================================
   STAR HOTELS
   Authentication System
   js/auth.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    console.log("=================================");
    console.log("STAR HOTELS - AUTH SYSTEM");
    console.log("=================================");


    // =====================================================
    // SUPABASE
    // =====================================================

    const supabase = window.supabaseClient;


    if (!supabase) {

        console.error(
            "❌ Supabase client is not available."
        );

        showMessage(
            "Supabase connection failed. Please check your configuration.",
            "error"
        );

        return;

    }


    console.log(
        "✓ Supabase client connected."
    );


    // =====================================================
    // COMMON ELEMENTS
    // =====================================================

    const registerForm =
        document.getElementById("registerForm");

    const loginForm =
        document.getElementById("loginForm");


    // =====================================================
    // MESSAGE
    // =====================================================

    function showMessage(
        message,
        type = "error"
    ) {

        const box =
            document.getElementById("authMessage");


        if (!box) {

            console.warn(
                "Auth message element not found:",
                message
            );

            return;

        }


        box.textContent = message;

        box.className =
            "auth-message " + type;

        box.style.display = "block";


        // Scroll message into view when needed
        try {

            box.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });

        } catch (error) {

            // Ignore scroll errors

        }

    }


    // =====================================================
    // HIDE MESSAGE
    // =====================================================

    function hideMessage() {

        const box =
            document.getElementById("authMessage");


        if (!box) {
            return;
        }


        box.textContent = "";

        box.className =
            "auth-message";

        box.style.display =
            "none";

    }


    // =====================================================
    // GET INPUT VALUE
    // =====================================================

    function getInputValue(id) {

        const element =
            document.getElementById(id);


        if (!element) {

            console.warn(
                "Input not found:",
                id
            );

            return "";

        }


        return element.value.trim();

    }


    // =====================================================
    // GET PASSWORD VALUE
    // =====================================================

    function getPasswordValue(id = "password") {

        const element =
            document.getElementById(id);


        if (!element) {

            console.warn(
                "Password input not found:",
                id
            );

            return "";

        }


        return element.value;

    }


    // =====================================================
    // EMAIL VALIDATION
    // =====================================================

    function isValidEmail(email) {

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        return emailPattern.test(email);

    }


    // =====================================================
    // FRIENDLY SUPABASE ERROR
    // =====================================================

    function getFriendlyAuthError(error) {

        if (!error) {

            return "Something went wrong. Please try again.";

        }


        const originalMessage =
            error.message ||
            String(error);


        const message =
            originalMessage.toLowerCase();


        // -----------------------------------------------
        // INVALID LOGIN
        // -----------------------------------------------

        if (
            message.includes(
                "invalid login credentials"
            )
        ) {

            return "Invalid email or password.";

        }


        // -----------------------------------------------
        // EMAIL NOT CONFIRMED
        // -----------------------------------------------

        if (
            message.includes(
                "email not confirmed"
            )
        ) {

            return (
                "Please confirm your email address " +
                "before logging in."
            );

        }


        // -----------------------------------------------
        // EMAIL ALREADY REGISTERED
        // -----------------------------------------------

        if (
            message.includes(
                "user already registered"
            ) ||
            message.includes(
                "already registered"
            )
        ) {

            return (
                "An account with this email already exists. " +
                "Please log in instead."
            );

        }


        // -----------------------------------------------
        // EMAIL RATE LIMIT
        // -----------------------------------------------

        if (
            message.includes(
                "rate limit"
            ) ||
            message.includes(
                "email rate limit exceeded"
            )
        ) {

            return (
                "Too many email requests were made. " +
                "Please wait a while and try again."
            );

        }


        // -----------------------------------------------
        // PASSWORD
        // -----------------------------------------------

        if (
            message.includes(
                "password"
            ) &&
            (
                message.includes("weak") ||
                message.includes("short") ||
                message.includes("characters")
            )
        ) {

            return (
                "Please use a stronger password with at least 6 characters."
            );

        }


        // -----------------------------------------------
        // INVALID EMAIL
        // -----------------------------------------------

        if (
            message.includes(
                "invalid email"
            )
        ) {

            return "Please enter a valid email address.";

        }


        // -----------------------------------------------
        // NETWORK
        // -----------------------------------------------

        if (
            message.includes(
                "network"
            ) ||
            message.includes(
                "fetch"
            )
        ) {

            return (
                "Unable to connect to the server. " +
                "Please check your internet connection and try again."
            );

        }


        // -----------------------------------------------
        // TOO MANY REQUESTS
        // -----------------------------------------------

        if (
            message.includes(
                "too many requests"
            )
        ) {

            return (
                "Too many requests. Please wait a moment and try again."
            );

        }


        // -----------------------------------------------
        // RETURN ORIGINAL
        // -----------------------------------------------

        return originalMessage;

    }


    // =====================================================
    // SET BUTTON LOADING
    // =====================================================

    function setButtonLoading(
        button,
        loadingText
    ) {

        if (!button) {
            return;
        }


        button.disabled = true;

        button.dataset.originalText =
            button.textContent;


        button.textContent =
            loadingText;

    }


    // =====================================================
    // RESTORE BUTTON
    // =====================================================

    function restoreButton(
        button,
        defaultText
    ) {

        if (!button) {
            return;
        }


        button.disabled = false;


        button.textContent =
            button.dataset.originalText ||
            defaultText;


        delete button.dataset.originalText;

    }


    // =====================================================
    // REDIRECT TO DASHBOARD
    // =====================================================

    function redirectToDashboard(
        delay = 700
    ) {

        setTimeout(
            function () {

                window.location.href =
                    "index.html";

            },
            delay
        );

    }


    // =====================================================
    // REGISTER
    // =====================================================

    if (registerForm) {

        console.log(
            "✓ Register form detected."
        );


        registerForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                hideMessage();


                // =========================================
                // GET VALUES
                // =========================================

                const hotelName =
                    getInputValue(
                        "hotelName"
                    );


                const fullName =
                    getInputValue(
                        "fullName"
                    );


                const phone =
                    getInputValue(
                        "phone"
                    );


                const email =
                    getInputValue(
                        "email"
                    );


                const password =
                    getPasswordValue(
                        "password"
                    );


                const button =
                    document.getElementById(
                        "registerButton"
                    );


                // =========================================
                // VALIDATION
                // =========================================

                if (!hotelName) {

                    showMessage(
                        "Please enter your hotel name.",
                        "error"
                    );

                    return;

                }


                if (!fullName) {

                    showMessage(
                        "Please enter your full name.",
                        "error"
                    );

                    return;

                }


                if (!email) {

                    showMessage(
                        "Please enter your email address.",
                        "error"
                    );

                    return;

                }


                if (!isValidEmail(email)) {

                    showMessage(
                        "Please enter a valid email address.",
                        "error"
                    );

                    return;

                }


                if (!password) {

                    showMessage(
                        "Please enter a password.",
                        "error"
                    );

                    return;

                }


                if (password.length < 6) {

                    showMessage(
                        "Password must be at least 6 characters.",
                        "error"
                    );

                    return;

                }


                // =========================================
                // DISABLE BUTTON
                // =========================================

                setButtonLoading(
                    button,
                    "CREATING ACCOUNT..."
                );


                // =========================================
                // REGISTER
                // =========================================

                try {

                    console.log(
                        "Creating hotel account..."
                    );


                    const {
                        data,
                        error
                    } =
                        await supabase.auth.signUp({

                            email:
                                email,

                            password:
                                password,

                            options: {

                                data: {

                                    hotel_name:
                                        hotelName,

                                    full_name:
                                        fullName,

                                    phone:
                                        phone

                                }

                            }

                        });


                    if (error) {

                        throw error;

                    }


                    console.log(
                        "Registration response:",
                        data
                    );


                    // =====================================
                    // USER CREATED
                    // =====================================

                    if (data?.user) {

                        // ---------------------------------
                        // EMAIL CONFIRMATION REQUIRED
                        // ---------------------------------

                        if (!data.session) {

                            showMessage(
                                "Account created successfully. Please check your email and confirm your account before logging in.",
                                "success"
                            );


                            // Clear password
                            const passwordInput =
                                document.getElementById(
                                    "password"
                                );


                            if (passwordInput) {

                                passwordInput.value =
                                    "";

                            }


                            return;

                        }


                        // ---------------------------------
                        // SESSION CREATED
                        // ---------------------------------

                        showMessage(
                            "Hotel account created successfully! Opening dashboard...",
                            "success"
                        );


                        redirectToDashboard(
                            800
                        );


                        return;

                    }


                    // =====================================
                    // UNKNOWN RESPONSE
                    // =====================================

                    showMessage(
                        "Registration completed. Please try logging in.",
                        "success"
                    );


                } catch (error) {

                    console.error(
                        "Registration error:",
                        error
                    );


                    showMessage(
                        getFriendlyAuthError(
                            error
                        ),
                        "error"
                    );

                } finally {

                    restoreButton(
                        button,
                        "CREATE HOTEL ACCOUNT"
                    );

                }

            }
        );

    }


    // =====================================================
    // LOGIN
    // =====================================================

    if (loginForm) {

        console.log(
            "✓ Login form detected."
        );


        loginForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                hideMessage();


                // =========================================
                // GET VALUES
                // =========================================

                const email =
                    getInputValue(
                        "email"
                    );


                const password =
                    getPasswordValue(
                        "password"
                    );


                const button =
                    document.getElementById(
                        "loginButton"
                    );


                // =========================================
                // VALIDATION
                // =========================================

                if (!email) {

                    showMessage(
                        "Please enter your email address.",
                        "error"
                    );

                    return;

                }


                if (!isValidEmail(email)) {

                    showMessage(
                        "Please enter a valid email address.",
                        "error"
                    );

                    return;

                }


                if (!password) {

                    showMessage(
                        "Please enter your password.",
                        "error"
                    );

                    return;

                }


                // =========================================
                // LOADING
                // =========================================

                setButtonLoading(
                    button,
                    "LOGGING IN..."
                );


                // =========================================
                // LOGIN
                // =========================================

                try {

                    console.log(
                        "Logging in..."
                    );


                    const {
                        data,
                        error
                    } =
                        await supabase.auth.signInWithPassword({

                            email:
                                email,

                            password:
                                password

                        });


                    if (error) {

                        throw error;

                    }


                    console.log(
                        "Login successful:",
                        data?.user?.email
                    );


                    showMessage(
                        "Login successful. Opening dashboard...",
                        "success"
                    );


                    redirectToDashboard(
                        700
                    );


                } catch (error) {

                    console.error(
                        "Login error:",
                        error
                    );


                    showMessage(
                        getFriendlyAuthError(
                            error
                        ),
                        "error"
                    );

                } finally {

                    restoreButton(
                        button,
                        "LOGIN"
                    );

                }

            }
        );

    }


    // =====================================================
    // PASSWORD SHOW / HIDE
    // =====================================================

    function setupPasswordToggle() {

        const toggleButtons =
            document.querySelectorAll(
                "[data-password-toggle]"
            );


        if (!toggleButtons.length) {

            return;

        }


        toggleButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const targetId =
                            button.dataset.passwordToggle;


                        const passwordInput =
                            document.getElementById(
                                targetId
                            );


                        if (!passwordInput) {

                            return;

                        }


                        if (
                            passwordInput.type ===
                            "password"
                        ) {

                            passwordInput.type =
                                "text";


                            button.textContent =
                                "Hide";

                        } else {

                            passwordInput.type =
                                "password";


                            button.textContent =
                                "Show";

                        }

                    }
                );

            }
        );

    }


    // =====================================================
    // CHECK EXISTING SESSION
    // =====================================================

    async function checkExistingSession() {

        try {

            const {
                data,
                error
            } =
                await supabase.auth.getSession();


            if (error) {

                console.error(
                    "Session check error:",
                    error
                );

                return;

            }


            const session =
                data?.session;


            if (session?.user) {

                console.log(
                    "Existing authenticated session:",
                    session.user.email
                );


                /*
                 * We intentionally do NOT automatically
                 * redirect here.
                 *
                 * This allows the user to remain on the
                 * login/register page if needed.
                 */

            } else {

                console.log(
                    "No active session."
                );

            }

        } catch (error) {

            console.error(
                "Existing session check failed:",
                error
            );

        }

    }


    // =====================================================
    // AUTH STATE LISTENER
    // =====================================================

    const {
        data: authListener
    } =
        supabase.auth.onAuthStateChange(
            function (
                event,
                session
            ) {

                console.log(
                    "Auth event:",
                    event
                );


                if (session?.user) {

                    console.log(
                        "Authenticated user:",
                        session.user.email
                    );

                }


                if (
                    event ===
                    "SIGNED_OUT"
                ) {

                    console.log(
                        "User signed out."
                    );

                }


                if (
                    event ===
                    "PASSWORD_RECOVERY"
                ) {

                    console.log(
                        "Password recovery session detected."
                    );

                }

            }
        );


    // Prevent unused-variable warnings in some environments
    if (!authListener) {

        console.warn(
            "Auth listener was not created."
        );

    }


    // =====================================================
    // INITIAL SESSION CHECK
    // =====================================================

    checkExistingSession();


    // =====================================================
    // PASSWORD TOGGLE
    // =====================================================

    setupPasswordToggle();


    // =====================================================
    // READY
    // =====================================================

    console.log(
        "================================="
    );

    console.log(
        "✓ STAR HOTELS AUTH SYSTEM READY"
    );

    console.log(
        "================================="
    );

});