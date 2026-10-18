package __PACOTE__;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onPause() {
        super.onPause();
        AZoteWidget.atualizarTodos(this);
    }

    @Override
    public void onStop() {
        super.onStop();
        AZoteWidget.atualizarTodos(this);
    }
}
