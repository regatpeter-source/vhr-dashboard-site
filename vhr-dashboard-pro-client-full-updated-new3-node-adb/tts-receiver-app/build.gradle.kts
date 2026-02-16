plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.vhr.dashboard"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.vhr.dashboard"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    val ksPath = System.getenv("VHR_KEYSTORE_PATH").orEmpty()
    val ksPass = System.getenv("VHR_KEYSTORE_PASSWORD").orEmpty()
    val keyAliasEnv = System.getenv("VHR_KEY_ALIAS").orEmpty()
    val keyPassEnv = System.getenv("VHR_KEY_PASSWORD").orEmpty().ifBlank { ksPass }
    val hasReleaseSigning = ksPath.isNotBlank() && ksPass.isNotBlank() && keyAliasEnv.isNotBlank()

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(ksPath)
                storePassword = ksPass
                keyAlias = keyAliasEnv
                keyPassword = keyPassEnv
            }
        }
    }

    buildTypes {
        debug {
            // Relay public HTTPS
            buildConfigField("String", "RELAY_URL", "\"https://www.vhr-dashboard-site.com\"")
            buildConfigField("String", "RELAY_SESSION_ID", "\"default\"")
        }
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("String", "RELAY_URL", "\"https://www.vhr-dashboard-site.com\"")
            buildConfigField("String", "RELAY_SESSION_ID", "\"default\"")
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = "11"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    lint {
        // Désactive les checks lint en release pour éviter les blocages (chemins Windows SDK)
        checkReleaseBuilds = false
        abortOnError = false
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }

    packagingOptions {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Core Android
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.material)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)
    implementation(libs.androidx.lifecycle.livedata.ktx)

    // Jetpack Compose
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.activity.compose)
    debugImplementation(libs.androidx.compose.ui.tooling)

    // Coroutines
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.coroutines.core)

    // Socket.IO client + JSON
    implementation("io.socket:socket.io-client:2.1.0") { exclude(group = "org.json", module = "json") }
    implementation("org.json:json:20231013")

    // Native WebSocket for mic uplink PCM stream
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // Testing
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.espresso)
}
