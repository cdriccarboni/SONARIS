import { readFile, writeFile } from "node:fs/promises";

const path = "android/app/build.gradle";
const marker = "// SONARIS_PLAY_CONFIG";
let gradle = await readFile(path, "utf8");

if (!gradle.includes(marker)) {
  gradle += `

${marker}
def sonarisStore = System.getenv("ANDROID_KEYSTORE_PATH")
def sonarisStorePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
def sonarisKeyAlias = System.getenv("ANDROID_KEY_ALIAS")
def sonarisKeyPassword = System.getenv("ANDROID_KEY_PASSWORD")
def sonarisSigningReady = [sonarisStore, sonarisStorePassword, sonarisKeyAlias, sonarisKeyPassword].every { it != null && !it.trim().isEmpty() }

android {
    defaultConfig {
        versionCode Integer.parseInt(System.getenv("ANDROID_VERSION_CODE") ?: "1")
        versionName System.getenv("ANDROID_VERSION_NAME") ?: "0.1.0"
    }

    signingConfigs {
        if (sonarisSigningReady) {
            create("sonarisRelease") {
                storeFile file(sonarisStore)
                storePassword sonarisStorePassword
                keyAlias sonarisKeyAlias
                keyPassword sonarisKeyPassword
            }
        }
    }

    buildTypes {
        release {
            if (sonarisSigningReady) {
                signingConfig signingConfigs.getByName("sonarisRelease")
            }
        }
    }
}
`;
  await writeFile(path, gradle);
}
