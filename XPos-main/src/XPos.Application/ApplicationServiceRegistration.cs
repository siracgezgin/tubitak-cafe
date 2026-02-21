using Microsoft.Extensions.DependencyInjection;
using XPos.Application.Interfaces;
using XPos.Application.Services;

namespace XPos.Application;

public static class ApplicationServiceRegistration
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IOrderService, OrderService>();
        return services;
    }
}
