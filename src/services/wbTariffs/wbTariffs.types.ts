export type WbTariffsResponse = {
    response: {
        data: {
            dtNextBox: string;
            dtTillMax: string;
            warehouseList: WbTariffsWarehouseResponse[];
        };
    };
};

export type WbTariffsWarehouseResponse = {
    warehouseName: string;
    geoName: string;
    boxDeliveryBase: number;
    boxDeliveryCoefExpr: number;
    boxDeliveryLiter: number;
    boxDeliveryMarketplaceBase: number;
    boxDeliveryMarketplaceCoefExpr: number;
    boxDeliveryMarketplaceLiter: number;
    boxStorageBase: number;
    boxStorageCoefExpr: number;
    boxStorageLiter: number;
};

export type WbTariffWarehouseRow = {
    tariffDate: Date;
    warehouseName: string;
    geoName: string;
    boxDeliveryBase: number;
    boxDeliveryCoefExpr: number;
    boxDeliveryLiter: number;
    boxDeliveryMarketplaceBase: number;
    boxDeliveryMarketplaceCoefExpr: number;
    boxDeliveryMarketplaceLiter: number;
    boxStorageBase: number;
    boxStorageCoefExpr: number;
    boxStorageLiter: number;
    fetchedAt: Date;
};

