import { supabase } from '../lib/supabase';
import { UAParser } from 'ua-parser-js';

type ActionType = 'auth' | 'assignment' | 'profile' | 'system' | 'class';

export const logUserActivity = async (
    userId: string,
    actionType: ActionType,
    actionDetails: string
) => {
    try {
        let ip_address = 'Unknown';
        let location = 'Unknown';

        // Fetch IP and Location from free public API
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data.ip) {
                ip_address = data.ip;
                location = [data.city, data.country_name].filter(Boolean).join(', ') || 'Unknown';
            }
        } catch (e) {
            console.warn('Could not fetch IP/Location data:', e);
        }

        // Parse User Agent to get Device and Browser
        const parser = new UAParser();
        const result = parser.getResult();
        
        let device = result.device.vendor 
            ? `${result.device.vendor} ${result.device.model || ''}`.trim() 
            : result.os.name || 'Unknown Device';

        // Add OS info if it's not a generic unknown device
        if (result.os.name && device !== result.os.name && device !== 'Unknown Device') {
            device += ` (${result.os.name})`;
        }
            
        const browser = result.browser.name 
            ? `${result.browser.name} ${result.browser.version || ''}`.trim() 
            : 'Unknown Browser';

        // Insert log to database
        const { error } = await supabase.from('user_activity_logs').insert([{
            user_id: userId,
            action_type: actionType,
            action_details: actionDetails,
            ip_address,
            location,
            device,
            browser
        }]);

        if (error) {
            console.error('Supabase Insert Error in Logs:', error);
        }
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
};
