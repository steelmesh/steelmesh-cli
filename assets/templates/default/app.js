module.exports = {
    routes: [
        '/time => test.getTime',
        
        {
            path: '/counter',
            handler: 'test.getCount'
        },
        
        { 
            path: '/html-test',
            handler: 'test.genHTML'
        }
    ],
    
    jobs: {
        'Test Job': {
            pattern: '*/5 * * * * *',
            handler: 'test.testJob'
        }
    }
};