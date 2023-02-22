import React, {useState} from 'react';

import {
    useBase, useCursor,
    useSettingsButton
} from '@airtable/blocks/ui';

import {SettingsContainer, MainContainer} from "./components";

export default function ChatGPT() {
    const base = useBase();
    const cursor = useCursor();
    const [isShowingSettings, setIsShowingSettings] = useState(false);

    useSettingsButton(function () {
        setIsShowingSettings(!isShowingSettings);
    });
    if (isShowingSettings) {
        return <SettingsContainer/>
    }
    let table = base.getTableById(cursor.activeTableId);
    let view = table.getViewById(cursor.activeViewId);

    return <MainContainer table={table} view={view}/>;
}