import { sleep, check, group, fail } from 'k6';
import http from 'k6/http';

const frontend = 'https://pizza.riverastuff.com';
const backend = 'https://pizza-service.riverastuff.com';
const factory = 'https://pizza-factory.cs329.click';

export const options = {
    cloud: {
        distribution: {
            'amazon:us:ashburn': {
                loadZone: 'amazon:us:ashburn',
                percent: 100,
            },
        },
        apm: [],
    },
    thresholds: {},
    scenarios: {
        Scenario_1: {
            executor: 'ramping-vus',
            gracefulStop: '30s',
            stages: [
                { target: 5, duration: '30s' },
                { target: 15, duration: '1m' },
                { target: 10, duration: '30s' },
                { target: 0, duration: '30s' },
            ],
            gracefulRampDown: '30s',
            exec: 'scenario_1',
        },
    },
};

export function scenario_1() {
    group('Login and order pizza', function () {
        let response;

        // Homepage
        response = http.get(frontend);
        sleep(6.1);

        // Login
        response = http.put(
            `${backend}/api/auth`,
            JSON.stringify({
                email: __ENV.PIZZA_EMAIL || 'a@jwt.com',
                password: __ENV.PIZZA_PASSWORD,
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        // Check login status
        if (!check(response, {
            'Login status is 200': (r) => r.status === 200,
        })) {
            console.log(response.body);
            fail('Login was not successful');
        }

        // Extract authentication JWT
        const authToken = response.json('token');

        if (!authToken) {
            fail('Authentication token was not returned');
        }

        const params = {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
                Origin: frontend,
            },
        };

        sleep(5.9);

        // Get menu
        response = http.get(
            `${backend}/api/order/menu`,
            params
        );

        check(response, {
            'Menu status is 200': (r) => r.status === 200,
        });

        // Get franchise
        response = http.get(
            `${backend}/api/franchise?page=0&limit=20&name=*`,
            params
        );

        check(response, {
            'Franchise status is 200': (r) => r.status === 200,
        });

        sleep(4.7);

        // Get current user
        response = http.get(
            `${backend}/api/user/me`,
            params
        );

        sleep(1);

        // Purchase pizza
        response = http.post(
            `${backend}/api/order`,
            JSON.stringify({
                items: [
                    {
                        menuId: 2,
                        description: 'Pepperoni',
                        price: 0.0042,
                    },
                ],
                storeId: '1',
                franchiseId: 1,
            }),
            params
        );

        // Check purchase status
        if (!check(response, {
            'Purchase status is 200': (r) => r.status === 200,
        })) {
            console.log(response.body);
            fail('Pizza purchase was not successful');
        }

        // Extract pizza JWT from purchase response
        const pizzaJwt = response.json('jwt');

        if (!check(pizzaJwt, {
            'Pizza JWT was returned': (jwt) =>
                typeof jwt === 'string' && jwt.length > 0,
        })) {
            fail('Pizza JWT was not returned');
        }

        sleep(9.6);

        // Verify the newly purchased pizza
        response = http.post(
            `${factory}/api/order/verify`,
            JSON.stringify({
                jwt: pizzaJwt,
            }),
            params
        );

        // Check pizza verification
        if (!check(response, {
            'Pizza verification status is 200': (r) =>
                r.status === 200,
        })) {
            console.log(response.body);
            fail('Pizza verification failed');
        }
    });
}