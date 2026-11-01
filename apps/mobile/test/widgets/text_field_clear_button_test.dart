import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/app/text_field_clear_button.dart';

void main() {
  testWidgets('hides when empty and clears the field on tap', (tester) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ListenableBuilder(
            listenable: controller,
            builder: (context, _) => TextField(
              controller: controller,
              decoration: InputDecoration(
                suffixIcon: TextFieldClearButton.maybe(
                  text: controller.text,
                  onPressed: controller.clear,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.byTooltip('Clear'), findsNothing);

    await tester.enterText(find.byType(TextField), 'foo');
    await tester.pump();

    expect(find.byTooltip('Clear'), findsOneWidget);

    await tester.tap(find.byTooltip('Clear'));
    await tester.pump();

    expect(controller.text, '');
    expect(find.byTooltip('Clear'), findsNothing);
  });
}
