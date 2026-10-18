package __PACOTE__;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Widget do AZote: pode gastar hoje, próximo compromisso e hábito do dia.
 *  Os dados são gravados pelo app em Preferences ("CapacitorStorage", chave "az-widget"). */
public class AZoteWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        RemoteViews v = montar(ctx);
        for (int id : ids) mgr.updateAppWidget(id, v);
    }

    static RemoteViews montar(Context ctx) {
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.az_widget);
        String[] v = { "—", ctx.getString(R.string.az_w_abra), "—", "", "", "" };
        try {
            SharedPreferences sp = ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String txt = sp.getString("az-widget", null);
            if (txt != null) {
                JSONObject o = new JSONObject(txt);
                String[] k = { "t1", "s1", "t2", "s2", "t3", "s3" };
                for (int i = 0; i < 6; i++) v[i] = o.optString(k[i], v[i]);
            }
        } catch (Exception e) {
            // sem dados ainda: mostra o padrão
        }
        int[] ids = { R.id.az_w_v1, R.id.az_w_s1, R.id.az_w_v2, R.id.az_w_s2, R.id.az_w_v3, R.id.az_w_s3 };
        for (int i = 0; i < 6; i++) rv.setTextViewText(ids[i], v[i]);
        rv.setOnClickPendingIntent(R.id.az_w_raiz, abrir(ctx, ctx.getString(R.string.az_w_link_raiz), 11));
        rv.setOnClickPendingIntent(R.id.az_w_botao, abrir(ctx, ctx.getString(R.string.az_w_link_botao), 12));
        rv.setOnClickPendingIntent(R.id.az_w_b3, abrir(ctx, ctx.getString(R.string.az_w_link_b3), 13));
        return rv;
    }

    static PendingIntent abrir(Context ctx, String url, int codigo) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url), ctx, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, codigo, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Chamado pelo app ao ir para o fundo: o widget mostra os números novos. */
    public static void atualizarTodos(Context ctx) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, AZoteWidget.class));
            if (ids == null || ids.length == 0) return;
            RemoteViews v = montar(ctx);
            for (int id : ids) mgr.updateAppWidget(id, v);
        } catch (Exception e) {
            // nunca derruba o app por causa do widget
        }
    }
}
