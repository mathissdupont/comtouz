import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:comtouz_mobile/src/api_client.dart';
import 'package:comtouz_mobile/src/app.dart';
import 'package:comtouz_mobile/src/app_controller.dart';
import 'package:comtouz_mobile/src/models.dart';

class _TestApiClient extends MobileApiClient {
  _TestApiClient() : super(baseUrl: 'http://localhost');

  @override
  Future<MobileUser> getMe() async {
    throw Exception('No session');
  }
}

void main() {
  testWidgets('renders Comtouz mobile shell', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWithValue(_TestApiClient())],
        child: const ComtouzApp(),
      ),
    );
    await tester.pump();

    expect(find.text('Comtouz Mobile'), findsOneWidget);
    expect(find.text('Development access'), findsOneWidget);
    expect(find.text('Identity'), findsOneWidget);
  });
}
