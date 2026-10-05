document.addEventListener("DOMContentLoaded", () => {

    const supabase = window.supabaseClient;


    // ==========================================
    // CHECK SUPABASE
    // ==========================================

    if (!supabase) {

        console.error(
            "Supabase client is not available."
        );

        showMessage(
            "Supabase connection failed. Check your configuration.",
            "error"
        );

        return;
    }


    console.log(
        "✓ Authentication system loaded"
    );


    // ==========================================
    // MESSAGE
    // ==========================================

    function showMessage(message, type) {

        const box =
            document.getElementById(
                "authMessage"
            );

        if (!box) return;

        box.textContent = message;

        box.className =
            "auth-message " + type;
    }


    // ==========================================
    // REGISTER
    // ==========================================

    const registerForm =
        document.getElementById(
            "registerForm"
        );


    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                const hotelName =
                    document
                        .getElementById("hotelName")
                        .value
                        .trim();


                const fullName =
                    document
                        .getElementById("fullName")
                        .value
                        .trim();


                const phone =
                    document
                        .getElementById("phone")
                        .value
                        .trim();


                const email =
                    document
                        .getElementById("email")
                        .value
                        .trim();


                const password =
                    document
                        .getElementById("password")
                        .value;


                const button =
                    document.getElementById(
                        "registerButton"
                    );


                button.disabled = true;

                button.textContent =
                    "CREATING ACCOUNT...";


                try {

                    const {
                        data,
                        error
                    } =
                        await supabase.auth.signUp({

                            email: email,

                            password: password,

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
                        "Registration:",
                        data
                    );


                    // Email confirmation enabled
                    if (
                        data.user &&
                        !data.session
                    ) {

                        showMessage(
                            "Account created successfully. Please check your email and confirm your account.",
                            "success"
                        );

                    }

                    // Automatically logged in
                    else {

                        showMessage(
                            "Hotel account created successfully!",
                            "success"
                        );


                        setTimeout(
                            () => {

                                window.location.href =
                                    "index.html";

                            },
                            1000
                        );

                    }


                } catch (error) {

                    console.error(
                        "Registration error:",
                        error
                    );


                    showMessage(
                        error.message ||
                        "Registration failed.",
                        "error"
                    );

                }


                button.disabled = false;

                button.textContent =
                    "CREATE HOTEL ACCOUNT";

            }
        );

    }


    // ==========================================
    // LOGIN
    // ==========================================

    const loginForm =
        document.getElementById(
            "loginForm"
        );


    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                const email =
                    document
                        .getElementById("email")
                        .value
                        .trim();


                const password =
                    document
                        .getElementById("password")
                        .value;


                const button =
                    document.getElementById(
                        "loginButton"
                    );


                button.disabled = true;

                button.textContent =
                    "LOGGING IN...";


                try {

                    const {
                        data,
                        error
                    } =
                        await supabase.auth.signInWithPassword({

                            email: email,

                            password: password

                        });


                    if (error) {
                        throw error;
                    }


                    console.log(
                        "Login successful:",
                        data.user.email
                    );


                    showMessage(
                        "Login successful. Opening dashboard...",
                        "success"
                    );


                    setTimeout(
                        () => {

                            window.location.href =
                                "index.html";

                        },
                        700
                    );


                } catch (error) {

                    console.error(
                        "Login error:",
                        error
                    );


                    showMessage(
                        error.message ||
                        "Login failed.",
                        "error"
                    );

                }


                button.disabled = false;

                button.textContent =
                    "LOGIN";

            }
        );

    }

});