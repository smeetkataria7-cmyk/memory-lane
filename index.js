// Custom entry point: expo-router still registers the app, but the widget
// task handler has to be registered on the same JS bundle so Android can
// start it headlessly when a widget needs drawing.
import 'expo-router/entry';

import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widgets/widget-task-handler';

registerWidgetTaskHandler(widgetTaskHandler);
