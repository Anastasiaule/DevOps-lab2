pipeline {
    agent any
    environment {
        PYTHON = 'C:/Users/Анастасия/AppData/Local/Programs/Python/Python314/python.exe'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Install dependencies') {
            steps {
                bat '"%PYTHON%" -m pip install -r requirements.txt'
            }
        }
        stage('Run tests') {
            steps {
                bat '"%PYTHON%" -m pytest -v'
            }
        }
        stage('Build images') {
            steps {
                bat 'docker compose build'
            }
        }
        stage('Deploy') {
            when { branch 'main' }
            steps {
                bat 'docker compose up -d --remove-orphans'
                retry(10) {
                    sleep time: 3, unit: 'SECONDS'
                    bat 'curl.exe -fsS http://localhost:8081/health'
                }
                bat 'docker compose ps'
                echo 'Application deployed in containers: http://localhost:8081'
            }
        }
    }
    post {
        success {
            echo 'CI pipeline completed successfully'
        }
        failure {
            echo 'CI pipeline failed'
        }
    }
}
