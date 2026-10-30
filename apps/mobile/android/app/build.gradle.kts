import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.rifttrades.rifttrades"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // Application ID must match the package name registered in Google Play Console.
        applicationId = "com.rifttrades.myapp"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            if (keystorePropertiesFile.exists()) {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                // Resolve relative to android/ (where key.properties lives), not the
                // app module dir, so storeFile paths stay unambiguous.
                storeFile = keystoreProperties["storeFile"]?.let { rootProject.file(it) }
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (keystorePropertiesFile.exists()) {
                signingConfigs.getByName("release")
            } else {
                // Fall back to debug signing so `flutter run --release` still works
                // before a release keystore has been configured.
                signingConfigs.getByName("debug")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

// purchases_flutter pulls in RevenueCat's Amazon Appstore add-on, whose bundled R8
// rules contain `-dontoptimize`. That one line turns R8 optimisation off for the
// whole app, which Play Console flags as "DEX code optimisation 0%". We only sell
// through Google Play, so leave it (and the Amazon SDK it brings) out. RevenueCat's
// core already tolerates the SDK being absent (`-dontwarn com.amazon.**`) and only
// touches it when configured for the Amazon store, which this app never is.
configurations.configureEach {
    exclude(group = "com.revenuecat.purchases", module = "purchases-store-amazon")
}

flutter {
    source = "../.."
}
