import Flutter
import StoreKit
import SwiftUI
import UIKit

/// Presents Apple's `SubscriptionStoreView` so the purchase screen always
/// includes the localized name, description, price, auto-renewal disclosure,
/// and Privacy / Terms of Use buttons required by Guideline 3.1.2.
final class SubscriptionStorePlugin: NSObject, FlutterPlugin {
  static let channelName = "rifttrades/subscription_store"

  private var pendingSession: PresentationSession?

  static func register(with registrar: FlutterPluginRegistrar) {
    let channel = FlutterMethodChannel(
      name: channelName,
      binaryMessenger: registrar.messenger()
    )
    let instance = SubscriptionStorePlugin()
    registrar.addMethodCallDelegate(instance, channel: channel)
  }

  func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "present":
      present(call: call, result: result)
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  private func present(call: FlutterMethodCall, result: @escaping FlutterResult) {
    if pendingSession != nil {
      result(
        FlutterError(
          code: "already_presenting",
          message: "A subscription store is already on screen.",
          details: nil
        )
      )
      return
    }

    guard #available(iOS 17.0, *) else {
      result("unavailable")
      return
    }

    let args = call.arguments as? [String: Any] ?? [:]
    let productIDs = (args["productIds"] as? [String]) ?? []
    guard !productIDs.isEmpty,
          let privacy = url(from: args["privacyPolicyUrl"]),
          let terms = url(from: args["termsOfUseUrl"])
    else {
      result("unavailable")
      return
    }

    guard let presenter = topViewController() else {
      result(
        FlutterError(
          code: "no_presenter",
          message: "Couldn't find a view controller to present the store.",
          details: nil
        )
      )
      return
    }

    let session = PresentationSession(result: result)
    pendingSession = session

    let store = ProSubscriptionStoreView(
      productIDs: productIDs,
      privacyURL: privacy,
      termsURL: terms,
      onFinish: { [weak self] outcome in
        self?.complete(outcome)
      }
    )
    let host = UIHostingController(rootView: store)
    host.modalPresentationStyle = .pageSheet
    if let sheet = host.sheetPresentationController {
      sheet.detents = [.large()]
      sheet.prefersGrabberVisible = true
    }
    presenter.present(host, animated: true)
  }

  private func complete(_ outcome: String) {
    pendingSession?.finish(outcome)
    pendingSession = nil
  }

  private func url(from value: Any?) -> URL? {
    guard let string = value as? String, let parsed = URL(string: string) else {
      return nil
    }
    return parsed
  }

  private func topViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let window = scenes
      .flatMap(\.windows)
      .first(where: \.isKeyWindow) ?? scenes.first?.windows.first
    var controller = window?.rootViewController
    while let presented = controller?.presentedViewController {
      controller = presented
    }
    return controller
  }
}

private final class PresentationSession {
  private var result: FlutterResult?
  private var finished = false

  init(result: @escaping FlutterResult) {
    self.result = result
  }

  func finish(_ outcome: String) {
    guard !finished else { return }
    finished = true
    result?(outcome)
    result = nil
  }
}

@available(iOS 17.0, *)
private struct ProSubscriptionStoreView: View {
  let productIDs: [String]
  let privacyURL: URL
  let termsURL: URL
  let onFinish: (String) -> Void

  @Environment(\.dismiss) private var dismiss

  var body: some View {
    SubscriptionStoreView(productIDs: productIDs) {
      marketing
    }
    .subscriptionStorePolicyDestination(url: privacyURL, for: .privacyPolicy)
    .subscriptionStorePolicyDestination(url: termsURL, for: .termsOfService)
    .storeButton(.visible, for: .restorePurchases)
    .storeButton(.visible, for: .redeemCode)
    .onInAppPurchaseCompletion { _, result in
      handlePurchase(result)
    }
    .onDisappear {
      onFinish("cancelled")
    }
  }

  private var marketing: some View {
    VStack(spacing: 12) {
      Image(systemName: "sparkles")
        .font(.system(size: 36, weight: .semibold))
        .foregroundStyle(.tint)
      Text("RiftTrades Pro")
        .font(.largeTitle.bold())
        .multilineTextAlignment(.center)
      Text(
        "Unlimited binder, want list, lending, and saved trades. "
          + "Plans auto-renew until you cancel."
      )
      .font(.body)
      .foregroundStyle(.secondary)
      .multilineTextAlignment(.center)
    }
    .padding(.horizontal, 24)
    .padding(.vertical, 16)
  }

  private func handlePurchase(_ result: Result<Product.PurchaseResult, Error>) {
    guard case .success(let purchaseResult) = result else { return }
    switch purchaseResult {
    case .success(_):
      onFinish("purchased")
      dismiss()
    case .userCancelled, .pending:
      break
    @unknown default:
      break
    }
  }
}
