# google_mlkit_text_recognition references optional language-specific recognizer
# classes (Chinese/Japanese/Korean/Devanagari) that this app doesn't depend on
# or use, since only the default Latin recognizer is needed. R8 can't find
# these classes at build time; the app never calls into them at runtime.
-dontwarn com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions$Builder
-dontwarn com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
-dontwarn com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions$Builder
-dontwarn com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
-dontwarn com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions$Builder
-dontwarn com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
-dontwarn com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions$Builder
-dontwarn com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions

# Flutter release enables R8 minify. ML Kit builds InputImage via LazyInstanceMap
# factories that R8 otherwise strips, which surfaces as:
#   PlatformException(InputImageConverterError, NullPointerException…getClass())
# inside InputImage.fromByteArray on every camera frame.
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_** { *; }
-keep class com.google.android.gms.internal.mlkit_common.** { *; }
-dontwarn com.google.mlkit.**
-dontwarn com.google.android.gms.internal.mlkit_**
