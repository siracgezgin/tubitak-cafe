using Microsoft.AspNetCore.SignalR;

namespace CafeML.WebAPI.Hubs;

/// <summary>
/// SignalR Hub - Anlık sipariş bildirimleri
/// Garson, Mutfak, Bar ve Kasa ekranlarına real-time güncelleme
/// </summary>
public class OrderHub : Hub
{
    /// <summary>
    /// Yeni sipariş talebi geldiğinde garsonlara bildirim
    /// </summary>
    public async Task YeniTalepBildirimi(object talep)
    {
        await Clients.Group("garsonlar").SendAsync("YeniTalep", talep);
    }
    
    /// <summary>
    /// Sipariş onaylandığında mutfak/bar'a bildirim
    /// </summary>
    public async Task SiparisOnaylandi(object siparis)
    {
        await Clients.Group("mutfak").SendAsync("YeniSiparis", siparis);
        await Clients.Group("bar").SendAsync("YeniSiparis", siparis);
    }
    
    /// <summary>
    /// Dashboard'a anlık güncelleme
    /// </summary>
    public async Task DashboardGuncelle(object data)
    {
        await Clients.Group("dashboard").SendAsync("DashboardGuncellendi", data);
    }
    
    /// <summary>
    /// Gruplara katılım - rol bazlı
    /// </summary>
    public async Task GrubaKatil(string grup)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, grup);
    }
    
    public async Task GruptenAyril(string grup)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, grup);
    }
}
